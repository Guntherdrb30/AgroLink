import assert from "node:assert/strict";
import { test } from "node:test";
import { canReadPrivateFile } from "../lib/blob/private-file-access.ts";

const file = {
  tenantId: "tenant-a",
  visibility: "PRIVATE",
  usage: "VERIFICATION_DOCUMENT",
  entityType: "tenant_verification",
};
const viewer = (role, tenantId = "tenant-a") => ({
  platformRole: null,
  memberships: [{ tenantId, role }],
});

test("Tenant owner and admin can read their own legal documents only", () => {
  assert.equal(canReadPrivateFile(file, viewer("TENANT_OWNER")), true);
  assert.equal(canReadPrivateFile(file, viewer("TENANT_ADMIN")), true);
  assert.equal(canReadPrivateFile(file, viewer("TENANT_OWNER", "tenant-b")), false);
  assert.equal(canReadPrivateFile(file, { platformRole: null, memberships: [] }), false);
});

test("Farm manager cannot read company identity files, but can view farm verification files", () => {
  assert.equal(canReadPrivateFile(file, viewer("FARM_MANAGER")), false);
  assert.equal(canReadPrivateFile({ ...file, entityType: "farm_verification" }, viewer("FARM_MANAGER")), true);
  assert.equal(canReadPrivateFile({ ...file, entityType: "farm_verification" }, viewer("FARM_MANAGER", "tenant-b")), false);
});

test("Platform reviewers may access verification, not financial or imported documents", () => {
  const admin = { platformRole: "PLATFORM_ADMIN", memberships: [] };
  assert.equal(canReadPrivateFile(file, admin), true);
  assert.equal(canReadPrivateFile({ ...file, usage: "IMPORT_FILE" }, admin), false);
  assert.equal(canReadPrivateFile({ ...file, usage: "REPORT_FILE" }, admin), false);
});

test("Fail closed for public, unowned, or unrelated documents", () => {
  assert.equal(canReadPrivateFile({ ...file, visibility: "PUBLIC" }, viewer("TENANT_OWNER")), false);
  assert.equal(canReadPrivateFile({ ...file, tenantId: null }, viewer("TENANT_OWNER")), false);
  assert.equal(canReadPrivateFile(file, viewer("OPERATOR")), false);
  assert.equal(canReadPrivateFile({ ...file, usage: "OPERATION_SHEET" }, viewer("OPERATOR")), true);
  assert.equal(canReadPrivateFile({ ...file, usage: "REPORT_FILE" }, viewer("ACCOUNTING")), true);
});
