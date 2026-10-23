import assert from "node:assert/strict";
import { test } from "node:test";
import {
  GANADIA_PILOT_CAP_MICRO_USD, GANADIA_USER_CAP_MICRO_USD,
  canReservePilot, chargePilotUsage, quotePilotReservation,
} from "../lib/ai/ganadia-budget-policy.ts";

test("shared USD 5 ceiling includes in-flight holds", () => {
  assert.equal(canReservePilot(4_900_000, 50_000, 0, 0, 50_000), true);
  assert.equal(canReservePilot(4_900_000, 50_000, 0, 0, 50_001), false);
  assert.equal(GANADIA_PILOT_CAP_MICRO_USD, 5_000_000);
});

test("per-user quota blocks while other users still have funds", () => {
  assert.equal(canReservePilot(0, 0, 950_000, 20_000, 30_000), true);
  assert.equal(canReservePilot(0, 0, 950_000, 20_000, 30_001), false);
  assert.equal(GANADIA_USER_CAP_MICRO_USD, 1_000_000);
});

test("negative and invalid accounting figures fail closed", () => {
  assert.equal(canReservePilot(0, -1, 0, 0, 50), false);
  assert.equal(canReservePilot(0, 0, 0, 0, 0), false);
  assert.equal(canReservePilot(0, 0, NaN, 0, 50), false);
});

test("reservation quotes UTF-8 input bytes and worst-case output before API call", () => {
  const payload = { instructions: "Experto ganadero", input: "¿Cuántas vacas tengo?" };
  const a = quotePilotReservation(payload, 300);
  const b = quotePilotReservation(payload, 600);
  assert.ok(a > 0 && b > a);
  assert.throws(() => quotePilotReservation(payload, 769), /AI_OUTPUT_CAP_INVALID/);
  assert.throws(() => quotePilotReservation({ input: "x".repeat(17_000) }, 200), /AI_INPUT_TOO_LARGE/);
});

test("usage is conservatively rounded up to integer micro-USD", () => {
  assert.equal(chargePilotUsage({ input_tokens: 1000, output_tokens: 100 }), 1200);
  assert.equal(chargePilotUsage({
    input_tokens: 1000, output_tokens: 100,
    input_tokens_details: { cached_tokens: 500 },
  }), 863);
  assert.throws(() => chargePilotUsage({ input_tokens: 100, output_tokens: 30,
    input_tokens_details: { cached_tokens: 101 } }), /AI_USAGE_MISSING/);
  assert.throws(() => chargePilotUsage({ input_tokens: NaN, output_tokens: 1 }), /AI_USAGE_MISSING/);
});
