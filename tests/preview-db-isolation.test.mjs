import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertIsolatedPreviewDatabase,
  isUnsafePreviewDatabase,
} from "../lib/security/preview-db-isolation.ts";

test("Preview is fail-closed until the database is isolated", () => {
  const originalVercelEnv = process.env.VERCEL_ENV;
  const originalDbIsolated = process.env.AGROLYNK_PREVIEW_DB_ISOLATED;
  try {
    process.env.VERCEL_ENV = "preview";
    delete process.env.AGROLYNK_PREVIEW_DB_ISOLATED;
    assert.equal(isUnsafePreviewDatabase(), true);
    assert.throws(assertIsolatedPreviewDatabase, /PREVIEW_DATABASE_NOT_ISOLATED/);

    process.env.AGROLYNK_PREVIEW_DB_ISOLATED = "false";
    assert.equal(isUnsafePreviewDatabase(), true);

    process.env.AGROLYNK_PREVIEW_DB_ISOLATED = "true";
    assert.equal(isUnsafePreviewDatabase(), false);
    assert.doesNotThrow(assertIsolatedPreviewDatabase);

    process.env.VERCEL_ENV = "production";
    delete process.env.AGROLYNK_PREVIEW_DB_ISOLATED;
    assert.equal(isUnsafePreviewDatabase(), false);
    assert.doesNotThrow(assertIsolatedPreviewDatabase);
  } finally {
    if (originalVercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = originalVercelEnv;
    if (originalDbIsolated === undefined) delete process.env.AGROLYNK_PREVIEW_DB_ISOLATED;
    else process.env.AGROLYNK_PREVIEW_DB_ISOLATED = originalDbIsolated;
  }
});
