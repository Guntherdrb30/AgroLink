import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateStressScenarios,
  demonstrationInputs,
  estimateRiskBySampling,
  simulateInvestment,
  validateSimulationInputs,
} from "../lib/simulations/investment-engine.ts";

test("El simulador no altera los supuestos originales ni escribe datos", () => {
  const inputs = structuredClone(demonstrationInputs.swine_fattening);
  const initial = structuredClone(inputs);
  const outcome = simulateInvestment(inputs);
  assert.deepEqual(inputs, initial);
  assert.ok(outcome.monthly.length === inputs.months);
  assert.ok(Number.isFinite(outcome.netCash));
  assert.ok(Number.isFinite(outcome.presentValue));
  assert.equal(outcome.unitLabel, "cabezas vendidas previstas");
});

test("Los costos, ingresos e inversión cuadran con el flujo neto total", () => {
  for (const key of ["bovine_fattening", "swine_fattening", "swine_breeding"]) {
    const outcome = simulateInvestment(structuredClone(demonstrationInputs[key]));
    assert.ok(Math.abs(outcome.netCash - (
      outcome.revenue - outcome.variableCosts - outcome.fixedCosts - outcome.capitalInvestment
    )) <= 0.03);
    assert.ok(Math.abs(outcome.monthly.at(-1).cumulative - outcome.netCash) <= 0.04);
  }
});

test("Más precio de venta aumenta ingreso y flujo neto en el escenario de engorde", () => {
  const original = structuredClone(demonstrationInputs.swine_fattening);
  const low = simulateInvestment({ ...original, salePricePerKg: 1 });
  const high = simulateInvestment({ ...original, salePricePerKg: 3 });
  assert.ok(high.revenue > low.revenue);
  assert.ok(high.netCash > low.netCash);
});

test("La mortalidad reduce el ingreso de ceba con el resto constante", () => {
  const original = structuredClone(demonstrationInputs.bovine_fattening);
  const good = simulateInvestment({ ...original, mortalityPercent: 0 });
  const bad = simulateInvestment({ ...original, mortalityPercent: 30 });
  assert.ok(good.revenue > bad.revenue);
});

test("El modelo de cría calcula lechones previstos y distingue los costos", () => {
  const original = structuredClone(demonstrationInputs.swine_breeding);
  const result = simulateInvestment(original);
  assert.equal(result.unitLabel, "lechones previstos");
  assert.ok(result.soldUnits > 0);
  assert.ok(result.revenue > 0);
  assert.ok(result.variableCosts >= original.heads * original.purchasePerHead);
});

test("Escenarios prudente y favorable responden a las variables editables", () => {
  for (const kind of ["bovine_fattening", "swine_fattening", "swine_breeding"]) {
    const scenario = calculateStressScenarios(structuredClone(demonstrationInputs[kind]));
    assert.deepEqual(scenario.map(item => item.name), ["prudente", "base", "favorable"]);
    assert.ok(scenario[0].result.netCash <= scenario[1].result.netCash);
    assert.ok(scenario[1].result.netCash <= scenario[2].result.netCash);
  }
});

test("La muestra aleatoria es reproducible y no se presenta como pronóstico calibrado", () => {
  const original = structuredClone(demonstrationInputs.swine_breeding);
  const first = estimateRiskBySampling(original, 100);
  const second = estimateRiskBySampling(original, 100);
  assert.deepEqual(first, second);
  assert.ok(first.p10 <= first.median);
  assert.ok(first.median <= first.p90);
  assert.ok(first.shareWithPositiveCash >= 0 && first.shareWithPositiveCash <= 100);
});

test("No permite horizonte menor que ciclo ni montos incompatibles", () => {
  const original = demonstrationInputs.bovine_fattening;
  assert.throws(() => validateSimulationInputs({ ...original, months: 2, cycleMonths: 5 }), /horizonte/i);
  assert.throws(() => validateSimulationInputs({ ...original, heads: -1 }), RangeError);
  assert.throws(() => validateSimulationInputs({ ...original, exitWeightKg: 30 }), RangeError);
  assert.throws(() => validateSimulationInputs({ ...original, salePricePerKg: Number.POSITIVE_INFINITY }), RangeError);
  assert.throws(() => estimateRiskBySampling(original, 100000), RangeError);
});
