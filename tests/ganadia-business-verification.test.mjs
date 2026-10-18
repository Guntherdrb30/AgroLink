import { test } from "node:test";
import assert from "node:assert/strict";
import { isBusinessVerificationRequired } from "../lib/config/business-verification.ts";
test("verification defaults to required for final launch", () => {
  assert.equal(isBusinessVerificationRequired(undefined), true);
  assert.equal(isBusinessVerificationRequired("true"), true);
});
test("explicit false pauses business paperwork without touching authentication", () => {
  assert.equal(isBusinessVerificationRequired("false"), false);
  assert.equal(isBusinessVerificationRequired("FALSE"), true);
});
