import assert from "node:assert/strict";
import { test } from "node:test";
import { canWriteClinicalRecord, validateClinicalDates } from "../lib/veterinary/clinical-policy.ts";

const eligible = {
  role: "VETERINARIAN",
  sameTenant: true,
  assignedToFarm: true,
  animalInFarm: true,
  professionalProfilePresent: true,
};

test("veterinarian may create clinical records only with all tenant, farm, animal, and profile checks", () => {
  assert.equal(canWriteClinicalRecord(eligible), true);
  for (const field of ["sameTenant", "assignedToFarm", "animalInFarm", "professionalProfilePresent"]) {
    assert.equal(canWriteClinicalRecord({ ...eligible, [field]: false }), false, field);
  }
});

test("other roles never gain veterinary writing authority merely by knowing a farm ID", () => {
  for (const role of ["TENANT_OWNER", "TENANT_ADMIN", "FARM_MANAGER", "ACCOUNTING", "OPERATOR", "ROOT", ""]) {
    assert.equal(canWriteClinicalRecord({ ...eligible, role }), false, role);
  }
});

test("clinical dates must be real, not future; follow-ups cannot precede treatment", () => {
  assert.equal(validateClinicalDates("2026-10-20", "2026-11-21", "2026-10-21"), true);
  assert.equal(validateClinicalDates("2026-02-30", undefined, "2026-10-21"), false);
  assert.equal(validateClinicalDates("2026-10-22", undefined, "2026-10-21"), false);
  assert.equal(validateClinicalDates("2026-10-20", "2026-10-19", "2026-10-21"), false);
  assert.equal(validateClinicalDates("2026-10-20", undefined, "2026-10-21"), true);
});
