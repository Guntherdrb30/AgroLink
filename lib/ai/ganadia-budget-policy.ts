/** Pure, fail-closed spending policy. USD amounts are stored as integer micro-USD. */
export const GANADIA_PILOT_ID = "ganadia-ai-pilot-v1";
export const GANADIA_PILOT_MODEL = "gpt-5.4-mini";
export const GANADIA_PILOT_CAP_MICRO_USD = 5_000_000; // USD 5 total
export const GANADIA_USER_CAP_MICRO_USD = 1_000_000; // USD 1 per user for pilot
export const GANADIA_MAX_REQUEST_BYTES = 16_384;
export const GANADIA_MAX_OUTPUT_TOKENS = 768;

/** 2026-10-23 standard text rates, USD/1M tokens (OpenAI published price). */
const INPUT_MICRO_USD_PER_TOKEN = 0.75;
const CACHED_INPUT_MICRO_USD_PER_TOKEN = 0.075;
const OUTPUT_MICRO_USD_PER_TOKEN = 4.5;

function validNonNegativeInteger(v: number): boolean {
  return Number.isSafeInteger(v) && v >= 0;
}

export type ModelTokenUsage = {
  input_tokens: number;
  output_tokens: number;
  input_tokens_details?: { cached_tokens?: number };
};

/**
 * A conservative per-call hold calculated before any paid request.
 * UTF-8 bytes upper-bound text tokenization, with an additional 2x safety factor
 * for protocol overhead and possible regional uplift. No billable hosted tools.
 */
export function quotePilotReservation(payload: unknown, maxOutputTokens: number): number {
  if (!Number.isInteger(maxOutputTokens) || maxOutputTokens < 16 ||
      maxOutputTokens > GANADIA_MAX_OUTPUT_TOKENS) {
    throw new Error("AI_OUTPUT_CAP_INVALID");
  }
  const bytes = new TextEncoder().encode(JSON.stringify(payload)).byteLength;
  if (!bytes || bytes > GANADIA_MAX_REQUEST_BYTES) throw new Error("AI_INPUT_TOO_LARGE");
  return Math.ceil((bytes * INPUT_MICRO_USD_PER_TOKEN +
    maxOutputTokens * OUTPUT_MICRO_USD_PER_TOKEN + 1024) * 2);
}

export function chargePilotUsage(usage: ModelTokenUsage): number {
  const input = usage.input_tokens;
  const output = usage.output_tokens;
  const cached = usage.input_tokens_details?.cached_tokens ?? 0;
  if (!validNonNegativeInteger(input) || !validNonNegativeInteger(output) ||
      !validNonNegativeInteger(cached) || cached > input) {
    throw new Error("AI_USAGE_MISSING");
  }
  return Math.ceil((input - cached) * INPUT_MICRO_USD_PER_TOKEN +
    cached * CACHED_INPUT_MICRO_USD_PER_TOKEN +
    output * OUTPUT_MICRO_USD_PER_TOKEN);
}

export function canReservePilot(
  globalSpent: number, globalHeld: number,
  userSpent: number, userHeld: number, quote: number,
): boolean {
  if (![globalSpent, globalHeld, userSpent, userHeld].every(validNonNegativeInteger) ||
      !Number.isSafeInteger(quote) || quote <= 0) return false;
  return globalSpent + globalHeld + quote <= GANADIA_PILOT_CAP_MICRO_USD &&
    userSpent + userHeld + quote <= GANADIA_USER_CAP_MICRO_USD;
}
