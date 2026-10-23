import { prisma } from "@/lib/db/prisma";
import {
  GANADIA_PILOT_ID,
  canReservePilot,
  quotePilotReservation,
  chargePilotUsage,
  type ModelTokenUsage,
} from "@/lib/ai/ganadia-budget-policy";

type PilotErrorCode = "PILOT_LEDGER_NOT_READY" | "PILOT_BUDGET_EXHAUSTED" |
  "PILOT_CHARGE_NOT_FOUND" | "PILOT_CHARGE_ALREADY_FINAL" | "PILOT_QUOTE_EXCEEDED";

export class GanadiaPilotBudgetError extends Error {
  constructor(public readonly code: PilotErrorCode) {
    super(code);
    this.name = "GanadiaPilotBudgetError";
  }
}

/** Every mutation that changes global exposure must lock this single DB row. */
const BUDGET_LOCK_SQL = 'SELECT "id" FROM "GanadiaAiPilotBudget" WHERE "id" = $1 FOR UPDATE';

export async function reserveGanadiaPilotCall(args: {
  tenantId: string;
  userId: string;
  payload: unknown;
  maxOutputTokens: number;
}): Promise<{ attemptId: string; reservedMicroUsd: number }> {
  const reservedMicroUsd = quotePilotReservation(args.payload, args.maxOutputTokens);
  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRawUnsafe<Array<{ id: string }>>(BUDGET_LOCK_SQL, GANADIA_PILOT_ID);
    if (locked.length !== 1) throw new GanadiaPilotBudgetError("PILOT_LEDGER_NOT_READY");
    const budget = await tx.ganadiaAiPilotBudget.findUnique({ where: { id: GANADIA_PILOT_ID } });
    if (!budget) throw new GanadiaPilotBudgetError("PILOT_LEDGER_NOT_READY");
    // The global FOR UPDATE lock serializes both per-user and global reservations.
    const settled = await tx.ganadiaAiPilotAttempt.aggregate({
      where: { userId: args.userId, status: "SETTLED" },
      _sum: { billedMicroUsd: true },
    });
    const held = await tx.ganadiaAiPilotAttempt.aggregate({
      where: { userId: args.userId, status: { in: ["RESERVED", "UNKNOWN"] } },
      _sum: { reservedMicroUsd: true },
    });
    if (!canReservePilot(
      budget.spentMicroUsd, budget.reservedMicroUsd,
      settled._sum.billedMicroUsd ?? 0, held._sum.reservedMicroUsd ?? 0, reservedMicroUsd,
    )) throw new GanadiaPilotBudgetError("PILOT_BUDGET_EXHAUSTED");
    const attempt = await tx.ganadiaAiPilotAttempt.create({
      data: {
        tenantId: args.tenantId, userId: args.userId,
        status: "RESERVED", reservedMicroUsd,
      },
    });
    await tx.ganadiaAiPilotBudget.update({
      where: { id: GANADIA_PILOT_ID },
      data: { reservedMicroUsd: { increment: reservedMicroUsd } },
    });
    return { attemptId: attempt.id, reservedMicroUsd };
  }, { maxWait: 10_000, timeout: 10_000 });
}

export async function settleGanadiaPilotCall(
  attemptId: string, usage: ModelTokenUsage,
): Promise<{ billedMicroUsd: number }> {
  const billedMicroUsd = chargePilotUsage(usage);
  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRawUnsafe<Array<{ id: string }>>(BUDGET_LOCK_SQL, GANADIA_PILOT_ID);
    if (locked.length !== 1) throw new GanadiaPilotBudgetError("PILOT_LEDGER_NOT_READY");
    const attempt = await tx.ganadiaAiPilotAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt) throw new GanadiaPilotBudgetError("PILOT_CHARGE_NOT_FOUND");
    if (attempt.status !== "RESERVED") throw new GanadiaPilotBudgetError("PILOT_CHARGE_ALREADY_FINAL");
    // If provider usage ever exceeds the conservative hold, retain that hold;
    // never silently release it or proceed to another paid call.
    if (billedMicroUsd > attempt.reservedMicroUsd) {
      throw new GanadiaPilotBudgetError("PILOT_QUOTE_EXCEEDED");
    }
    await tx.ganadiaAiPilotBudget.update({
      where: { id: GANADIA_PILOT_ID },
      data: {
        reservedMicroUsd: { decrement: attempt.reservedMicroUsd },
        spentMicroUsd: { increment: billedMicroUsd },
      },
    });
    await tx.ganadiaAiPilotAttempt.update({
      where: { id: attemptId },
      data: {
        status: "SETTLED", billedMicroUsd,
        inputTokens: usage.input_tokens, outputTokens: usage.output_tokens,
      },
    });
    return { billedMicroUsd };
  }, { maxWait: 10_000, timeout: 10_000 });
}

/**
 * API timeouts, errors without usage, or ambiguous settlement remain charged
 * against the available pilot budget until an administrator reconciles them.
 */
export async function markGanadiaPilotUnknown(attemptId: string): Promise<void> {
  await prisma.ganadiaAiPilotAttempt.updateMany({
    where: { id: attemptId, status: "RESERVED" },
    data: { status: "UNKNOWN" },
  });
}
