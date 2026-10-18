import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveFileVisibility } from "../lib/blob/visibility-policy.ts";

test("Sensitive document classifications cannot be downgraded", () => {
  assert.equal(resolveFileVisibility("PRIVATE"), "PRIVATE");
  assert.equal(resolveFileVisibility("PRIVATE", "PRIVATE"), "PRIVATE");
  assert.throws(() => resolveFileVisibility("PRIVATE", "PUBLIC"), /FILE_VISIBILITY_OVERRIDE_FORBIDDEN/);
});

test("Public product media does not get silently stored as private", () => {
  assert.equal(resolveFileVisibility("PUBLIC"), "PUBLIC");
  assert.throws(() => resolveFileVisibility("PUBLIC", "PRIVATE"), /FILE_VISIBILITY_OVERRIDE_FORBIDDEN/);
});
