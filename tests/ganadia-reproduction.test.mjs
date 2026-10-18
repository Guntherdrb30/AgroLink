import { test } from "node:test";
import assert from "node:assert/strict";
import { reproductionRecordSchema } from "../lib/validators/reproduction.ts";
import { reproductiveStatusAfter, getNextReproductionCheck } from "../lib/livestock/reproduction.ts";
const base = { animalId: "cm0a12345678901234567890", eventDate: "2026-10-18" };
test("service, pregnancy, calving statuses", () => {
  assert.equal(reproductiveStatusAfter("UNKNOWN", "SERVICE"), "OPEN");
  assert.equal(reproductiveStatusAfter("OPEN", "PREGNANCY_CHECK", "POSITIVE"), "PREGNANT");
  assert.equal(reproductiveStatusAfter("PREGNANT", "PREGNANCY_CHECK", "NEGATIVE"), "OPEN");
  assert.equal(reproductiveStatusAfter("PREGNANT", "CALVING"), "LACTATING");
});
test("require method and pregnancy diagnosis", () => {
  assert.equal(reproductionRecordSchema.safeParse({ ...base, kind: "SERVICE" }).success, false);
  assert.equal(reproductionRecordSchema.safeParse({ ...base, kind: "PREGNANCY_CHECK" }).success, false);
  assert.equal(reproductionRecordSchema.safeParse({ ...base, kind: "SERVICE", method: "INSEMINATION" }).success, true);
});
test("reject invalid and backward dates", () => {
  assert.equal(reproductionRecordSchema.safeParse({ ...base, kind: "FOLLOW_UP", eventDate: "2026-02-30" }).success, false);
  assert.equal(reproductionRecordSchema.safeParse({ ...base, kind: "FOLLOW_UP", nextCheckAt: "2026-10-17" }).success, false);
});
test("only most recent event defines pending control", () => {
  const mk = (id, date, next) => ({id, dateIso: date, createdAtIso: date, note:null, actorName:null,details:{module:"GANADIA_REPRODUCTION",kind:"FOLLOW_UP",nextCheckAt:next}});
  assert.equal(getNextReproductionCheck([mk("one","2026-10-01","2026-11-01"),mk("two","2026-10-18",undefined)]),null);
});
