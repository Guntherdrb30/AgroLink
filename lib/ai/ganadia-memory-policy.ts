import { createHash } from "node:crypto";

export type GanadiaMemoryTurn = { role: "user" | "assistant"; content: string };

/**
 * A permission change creates a different conversation scope; historical
 * responses with previously accessible data are not exposed after revocation.
 * No hash is accepted from the client.
 */
export function ganadiaConversationScope(args: {
  tenantId: string;
  userId: string;
  role: string;
  authorizedFarmIds: readonly string[];
}): string {
  return createHash("sha256").update(JSON.stringify([
    args.tenantId,
    args.userId,
    args.role,
    [...new Set(args.authorizedFarmIds)].sort(),
  ])).digest("hex");
}

/**
 * The database stores the full transcript; only a bounded recent slice is
 * provided to OpenAI to keep the pilot charge predictable.
 * Historical user claims and previous assistant replies are NOT fresh ERP data.
 */
export function selectGanadiaModelHistory(
  turns: readonly GanadiaMemoryTurn[],
  maxMessages = 12,
  maxCharacters = 4000,
): GanadiaMemoryTurn[] {
  const selected: GanadiaMemoryTurn[] = [];
  let remaining = maxCharacters;
  for (let index = turns.length - 1; index >= 0 && selected.length < maxMessages; index--) {
    const turn = turns[index];
    if (turn.role !== "user" && turn.role !== "assistant") continue;
    const content = turn.content?.trim();
    if (!content) continue;
    const limit = Math.min(remaining, turn.role === "user" ? 700 : 1300);
    if (limit < 80) break;
    const safeContent = content.length > limit
      ? content.slice(0, Math.max(0, limit - 20)) + " [texto recortado]"
      : content;
    selected.unshift({ role: turn.role, content: safeContent });
    remaining -= safeContent.length;
  }
  return selected;
}
