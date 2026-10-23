import { prisma } from "@/lib/db/prisma";
import {
  GANADIA_PILOT_MODEL, GANADIA_MAX_OUTPUT_TOKENS,
} from "@/lib/ai/ganadia-budget-policy";
import {
  reserveGanadiaPilotCall, settleGanadiaPilotCall,
  markGanadiaPilotUnknown,
} from "@/lib/ai/ganadia-budget";
import type {
  GanadiaModelRequest, GanadiaModelResponse,
} from "@/lib/ai/ganadia-openai-core";

/** Paid requests are always preceded by a durable, shared budget reservation. */
export async function invokeGanadiaPilotedOpenAI(
  context: { tenantId: string; userId: string }, payload: GanadiaModelRequest,
): Promise<GanadiaModelResponse> {
  if (process.env.GANADIA_AI_PAID_ENABLED !== "true" ||
      process.env.GANADIA_AI_COST_APPROVED !== "true" ||
      !process.env.OPENAI_API_KEY) {
    throw new Error("AI_PAID_NOT_APPROVED");
  }
  if (payload.model !== GANADIA_PILOT_MODEL ||
      payload.max_output_tokens > GANADIA_MAX_OUTPUT_TOKENS ||
      payload.store !== false || payload.tools.some(t => t.type !== "function")) {
    throw new Error("AI_REQUEST_POLICY_DENIED");
  }
  const reserved = await reserveGanadiaPilotCall({
    tenantId: context.tenantId, userId: context.userId,
    payload, maxOutputTokens: payload.max_output_tokens,
  });
  let finalized = false;
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + process.env.OPENAI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok) throw new Error("OPENAI_HTTP_" + response.status);
    const data = await response.json() as GanadiaModelResponse;
    if (!data.usage) throw new Error("OPENAI_USAGE_NOT_REPORTED");
    await settleGanadiaPilotCall(reserved.attemptId, data.usage);
    finalized = true;
    return data;
  } catch (e) {
    if (!finalized) {
      // Fail closed: an uncertain provider charge must not free a budget hold.
      await markGanadiaPilotUnknown(reserved.attemptId).catch(err => {
        console.error("GanadIA pilot settlement requires manual reconciliation", err);
      });
    }
    throw e;
  }
}
