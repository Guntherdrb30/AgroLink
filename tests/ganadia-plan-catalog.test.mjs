import assert from "node:assert/strict";
import { test } from "node:test";
import {
  GANADIA_PLANS,
  recommendPlanForAnimalCount,
  needsPlanUpgrade,
} from "../lib/billing/plan-catalog.ts";

test("Plan thresholds have no overlaps and no gaps", () => {
  const boundaries = [
    [0, "ESENCIAL"], [99, "ESENCIAL"],
    [100, "PRODUCTIVA"], [299, "PRODUCTIVA"],
    [300, "INTEGRAL"], [1500, "INTEGRAL"],
    [1501, "PROFESIONAL"], [3000, "PROFESIONAL"],
    [3001, "CORPORATIVO"], [999999, "CORPORATIVO"],
  ];
  for (const [count, expected] of boundaries) {
    assert.equal(recommendPlanForAnimalCount(count).code, expected);
  }
  for (let i = 1; i < GANADIA_PLANS.length; i++) {
    assert.equal(GANADIA_PLANS[i].minActiveAnimals, GANADIA_PLANS[i - 1].maxActiveAnimals + 1);
  }
});

test("Reject fractional, negative and invalid animal counts", () => {
  for (const value of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => recommendPlanForAnimalCount(value), /INVALID_ACTIVE_ANIMAL_COUNT/);
  }
});

test("Growing hato recommends upgrade without blocking animal records", () => {
  assert.equal(needsPlanUpgrade("PRODUCTIVA", 299), false);
  assert.equal(needsPlanUpgrade("PRODUCTIVA", 300), true);
  assert.equal(needsPlanUpgrade("CORPORATIVO", 15000), false);
});

test("Every paid tier declares proposed USD price and included IA credits", () => {
  assert.deepEqual(GANADIA_PLANS.slice(0, 4).map(({ monthlyUsd, monthlyAiCredits }) => [monthlyUsd, monthlyAiCredits]),
    [[29, 300], [79, 1000], [149, 2000], [249, 4000]]);
});
