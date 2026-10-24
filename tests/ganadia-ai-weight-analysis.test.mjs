import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeAnimalWeight } from "../lib/ai/ganadia-weight-analysis.ts";
const base = {
  code: "DEMO-001", farmName: "Finca Demo", fichaKg: 470,
  observations: [
    {kg:440, recordedAt:"2026-09-23T00:00:00.000Z"},
    {kg:420, recordedAt:"2026-08-24T00:00:00.000Z"},
  ],
};
test("last verified weight is distinct from undated ficha weight", () => {
  const x=analyzeAnimalWeight(base,new Date("2026-10-23T12:00:00Z"),450);
  assert.equal(x.latestKg,440);
  assert.equal(x.latestDate,"2026-09-23");
  assert.equal(x.fichaAboveThreshold,true);
  assert.equal(x.measuredAboveThreshold,false);
  assert.ok(Math.abs(x.gainKgPerDay-20/30)<0.000001);
  assert.equal(x.estimatedTodayKg,460);
  assert.equal(x.estimatedTodayCrossing,true);
  assert.equal(x.estimatedIn30DaysKg,480);
  assert.equal(x.projected30DaysCrossing,true);
});
test("threshold equality qualifies only when physically measured at threshold", () => {
  const x=analyzeAnimalWeight({...base,fichaKg:430,observations:[{kg:450,recordedAt:"2026-10-13"}]},new Date("2026-10-23"),450);
  assert.equal(x.measuredAboveThreshold,true);
  assert.equal(x.fichaAboveThreshold,false);
  assert.equal(x.gainKgPerDay,null);
  assert.equal(x.estimatedTodayKg,null);
});
test("duplicate weights on the same date cannot create imaginary daily gain", () => {
  const x=analyzeAnimalWeight({...base,observations:[
    {kg:441,recordedAt:"2026-10-10"},
    {kg:440,recordedAt:"2026-10-10"},
    {kg:420,recordedAt:"2026-09-01"},
  ]},new Date("2026-10-23"),450);
  assert.equal(x.previousDate,"2026-09-01");
  assert.equal(x.gainKgPerDay,21/39);
});
test("stale weighing cannot be projected", () => {
  const x=analyzeAnimalWeight(base,new Date("2027-01-23"),450);
  assert.equal(x.estimatedTodayKg,null);
  assert.equal(x.projected30DaysCrossing,false);
});
test("implausible growth, no history, future measurements are never projected", () => {
  const huge=analyzeAnimalWeight({...base,observations:[
    {kg:430,recordedAt:"2026-10-20"},
    {kg:300,recordedAt:"2026-10-01"},
    {kg:900,recordedAt:"2026-10-24"},
  ]},new Date("2026-10-23"),450);
  assert.equal(huge.latestKg,430);
  assert.equal(huge.estimatedTodayKg,null);
  const first=analyzeAnimalWeight({...base,observations:[{kg:440,recordedAt:"2026-10-12"}]},new Date("2026-10-23"),450);
  assert.equal(first.gainKgPerDay,null);
  assert.equal(first.estimatedTodayKg,null);
});
test("forecast stops at 60 days without a new weigh-in", () => {
  const x=analyzeAnimalWeight({...base,observations:[
    {kg:445,recordedAt:"2026-09-01"}, {kg:425,recordedAt:"2026-08-01"},
  ]},new Date("2026-10-23"),450);
  assert.ok(x.estimatedTodayKg!==null);
  assert.equal(x.estimatedIn30DaysKg,null);
});
test("invalid threshold is rejected", () => {
  assert.throws(()=>analyzeAnimalWeight(base,new Date("2026-10-23"),0),/INVALID_WEIGHT/);
  assert.throws(()=>analyzeAnimalWeight(base,new Date("2026-10-23"),2500),/INVALID_WEIGHT/);
});
