import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_SERVER_FARM_UPLOAD_BYTES, createFarmUploadPath, farmUploadOriginalName, farmUploadPrefix,
  isFarmUploadPathForActor, validateFarmUploadFile,
} from "../lib/blob/farm-upload-policy.ts";

const scope = { tenantId: "tenant-a", userId: "user-a", farmId: "farm-a", kind: "primaryImage" };
const nonce = "12345678-1234-4234-8234-123456789abc";

test("farm images support 10MB and logos only 5MB", () => {
  assert.equal(validateFarmUploadFile("primaryImage", "finca.jpg", "image/jpeg", 9 * 1024 * 1024), null);
  assert.match(validateFarmUploadFile("logo", "logo.png", "image/png", 6 * 1024 * 1024), /5 MB/);
  assert.match(validateFarmUploadFile("primaryImage", "bad.svg", "image/svg+xml", 100), /JPEG/);
  assert.match(validateFarmUploadFile("primaryImage", "fake.jpg", "image/png", 100), /formato/);
});

test("private upload path is strictly scoped by tenant, user, farm, kind and UUID", () => {
  const path = createFarmUploadPath(scope, "FOTO Mi Finca.jpeg", nonce);
  assert.ok(path.startsWith(farmUploadPrefix(scope)));
  assert.equal(farmUploadOriginalName(path), "foto-mi-finca.jpeg");
  assert.equal(isFarmUploadPathForActor(path, scope), true);
  assert.equal(isFarmUploadPathForActor(path, { ...scope, tenantId: "tenant-b" }), false);
  assert.equal(isFarmUploadPathForActor(path, { ...scope, userId: "user-b" }), false);
  assert.equal(isFarmUploadPathForActor(path, { ...scope, farmId: "farm-b" }), false);
  assert.equal(isFarmUploadPathForActor(path, { ...scope, kind: "logo" }), false);
  assert.equal(isFarmUploadPathForActor(path.replace(nonce, "evil"), scope), false);
  assert.equal(isFarmUploadPathForActor(path + "/escape", scope), false);
});

test("staged new farm asset is not attachable to an existing farm", () => {
  const newScope = { ...scope, farmId: null };
  const path = createFarmUploadPath(newScope, "original.webp", nonce);
  assert.equal(isFarmUploadPathForActor(path, newScope), true);
  assert.equal(isFarmUploadPathForActor(path, scope), false);
});


test("staging upload stays below the platform 4.5MB request limit", () => {
  assert.ok(MAX_SERVER_FARM_UPLOAD_BYTES < 4_500_000);
  assert.ok(MAX_SERVER_FARM_UPLOAD_BYTES > 1_000_000);
  assert.equal(validateFarmUploadFile("primaryImage", "sample.webp", "image/webp", MAX_SERVER_FARM_UPLOAD_BYTES), null);
});
