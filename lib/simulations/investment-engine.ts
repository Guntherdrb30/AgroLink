/**
 * Deterministic cash-flow sandbox for farm investments.
 *
 * This is NOT a statutory accounting profit forecast, veterinary guidance,
 * market quotation, or a predictive AI system. Figures are user-supplied
 * assumptions and model outcomes; no real ledger rows are modified.
 */
export type ProjectKind = "bovine_fattening" | "swine_fattening" | "swine_breeding";

export type SimulationInputs = {
  kind: ProjectKind;
  heads: number;
  months: number;
  cycleMonths: number;
  entryWeightKg: number;
  exitWeightKg: number;
  mortalityPercent: number;
  purchasePerHead: number;
  feedConversionRatio: number;
  feedPricePerKg: number;
  salePricePerKg: number;
  otherCostPerHead: number;
  fixedCostMonthly: number;
  infrastructureInvestment: number;
  annualDiscountPercent: number;
  littersPerSowYear: number;
  pigletsBornPerLitter: number;
  pigletSurvivalPercent: number;
  pigletSalePrice: number;
  sowMonthlyCost: number;
  pigletCostPerHead: number;
};

export type SimulationResult = {
  revenue: number;
  variableCosts: number;
  fixedCosts: number;
  capitalInvestment: number;
  netCash: number;
  presentValue: number;
  breakEvenPrice: number | null;
  soldUnits: number;
  unitLabel: string;
  monthly: { month: number; cashFlow: number; cumulative: number }[];
  paybackMonth: number | null;
};

const money = (n: number) => Math.round(n * 100) / 100;
const checkNumber = (value: number, key: string, min: number, max: number) => {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new RangeError("Parámetro fuera de rango: " + key);
  }
};
export function validateSimulationInputs(input: SimulationInputs) {
  if (!["bovine_fattening", "swine_fattening", "swine_breeding"].includes(input.kind)) {
    throw new RangeError("Tipo de explotación no válido");
  }
  checkNumber(input.heads, "animales", 1, 100000);
  checkNumber(input.months, "horizonte", 1, 120);
  checkNumber(input.cycleMonths, "meses de ciclo", 1, 120);
  checkNumber(input.entryWeightKg, "peso inicial", 0, 3000);
  checkNumber(input.exitWeightKg, "peso final", 0, 3000);
  checkNumber(input.mortalityPercent, "mortalidad", 0, 100);
  checkNumber(input.purchasePerHead, "compra por cabeza", 0, 10000000);
  checkNumber(input.feedConversionRatio, "conversión alimenticia", 0, 100);
  checkNumber(input.feedPricePerKg, "costo de alimento", 0, 1000000);
  checkNumber(input.salePricePerKg, "precio por kg", 0, 1000000);
  checkNumber(input.otherCostPerHead, "otros costos", 0, 1000000);
  checkNumber(input.fixedCostMonthly, "costos fijos", 0, 100000000);
  checkNumber(input.infrastructureInvestment, "inversión", 0, 1000000000);
  checkNumber(input.annualDiscountPercent, "descuento", 0, 100);
  checkNumber(input.littersPerSowYear, "partos por madre", 0, 5);
  checkNumber(input.pigletsBornPerLitter, "nacidos por parto", 0, 30);
  checkNumber(input.pigletSurvivalPercent, "supervivencia", 0, 100);
  checkNumber(input.pigletSalePrice, "precio del lechón", 0, 100000);
  checkNumber(input.sowMonthlyCost, "costo mensual por madre", 0, 100000);
  checkNumber(input.pigletCostPerHead, "costo por lechón", 0, 100000);
  if (!Number.isInteger(input.heads) || !Number.isInteger(input.months) ||
      !Number.isInteger(input.cycleMonths)) throw new RangeError("Cantidades y meses deben ser enteros");
  if (input.kind !== "swine_breeding" && input.cycleMonths > input.months) {
    throw new RangeError("El horizonte debe cubrir al menos un ciclo completo de engorde");
  }
  if (input.kind !== "swine_breeding" && input.exitWeightKg <= input.entryWeightKg) {
    throw new RangeError("El peso de salida debe ser mayor que el de entrada");
  }
}

export function simulateInvestment(input: SimulationInputs): SimulationResult {
  validateSimulationInputs(input);
  let revenue = 0;
  let variableCosts = 0;
  let fixedCosts = 0;
  let npv = -input.infrastructureInvestment;
  let cumulative = -input.infrastructureInvestment;
  let paybackMonth: number | null = null;
  let soldUnits = 0;
  const monthly: SimulationResult["monthly"] = [];
  const breeder = input.kind === "swine_breeding";
  const livestockGainKg = Math.max(0, input.exitWeightKg - input.entryWeightKg);
  const survivorHeads = input.heads * (1 - input.mortalityPercent / 100);
  let totalSoldWeight = 0;

  for (let month = 1; month <= input.months; month++) {
    let monthRevenue = 0;
    let monthVariable = 0;
    const monthFixed = input.fixedCostMonthly;

    if (breeder) {
      // Expected-value birth production: an estimate, not a counted litter.
      const weanedExpected = input.heads * input.littersPerSowYear *
        input.pigletsBornPerLitter * (input.pigletSurvivalPercent / 100) / 12;
      monthRevenue = weanedExpected * input.pigletSalePrice;
      monthVariable = input.heads * input.sowMonthlyCost +
        weanedExpected * input.pigletCostPerHead;
      if (month === 1) monthVariable += input.heads * input.purchasePerHead;
      soldUnits += weanedExpected;
    } else {
      const cycle = input.cycleMonths;
      const cycleStart = (month - 1) % cycle === 0;
      const fullCycleFits = month + cycle - 1 <= input.months;
      const cycleActive = Math.floor((month - 1) / cycle) < Math.floor(input.months / cycle);
      if (cycleStart && fullCycleFits) {
        monthVariable += input.heads * input.purchasePerHead;
      }
      if (cycleActive) {
        // Simpler aggregated model: equivalent consumption for a full starting batch.
        const totalCycleFeed = input.heads * livestockGainKg *
          input.feedConversionRatio * input.feedPricePerKg;
        monthVariable += totalCycleFeed / cycle;
      }
      if (month % cycle === 0 && cycleActive) {
        const saleWeight = survivorHeads * input.exitWeightKg;
        monthRevenue = saleWeight * input.salePricePerKg;
        totalSoldWeight += saleWeight;
        soldUnits += survivorHeads;
        monthVariable += input.heads * input.otherCostPerHead;
      }
    }

    revenue += monthRevenue;
    variableCosts += monthVariable;
    fixedCosts += monthFixed;
    const cashFlow = monthRevenue - monthVariable - monthFixed;
    cumulative += cashFlow;
    npv += cashFlow / Math.pow(1 + input.annualDiscountPercent / 100, month / 12);
    if (cumulative >= 0 && paybackMonth === null) paybackMonth = month;
    monthly.push({ month, cashFlow: money(cashFlow), cumulative: money(cumulative) });
  }

  const totalCosts = variableCosts + fixedCosts + input.infrastructureInvestment;
  const breakEvenPrice = breeder
    ? (soldUnits > 0 ? totalCosts / soldUnits : null)
    : (totalSoldWeight > 0 ? totalCosts / totalSoldWeight : null);
  return {
    revenue: money(revenue),
    variableCosts: money(variableCosts),
    fixedCosts: money(fixedCosts),
    capitalInvestment: money(input.infrastructureInvestment),
    netCash: money(revenue - totalCosts),
    presentValue: money(npv),
    breakEvenPrice: breakEvenPrice === null ? null : money(breakEvenPrice),
    soldUnits: money(soldUnits),
    unitLabel: breeder ? "lechones previstos" : "cabezas vendidas previstas",
    monthly, paybackMonth,
  };
}

export type StressLevel = "prudente" | "base" | "favorable";
export function calculateStressScenarios(input: SimulationInputs) {
  const map: Record<StressLevel, SimulationInputs> = {
    prudente: {
      ...input,
      salePricePerKg: input.salePricePerKg * 0.85,
      pigletSalePrice: input.pigletSalePrice * 0.85,
      feedPricePerKg: input.feedPricePerKg * 1.15,
      sowMonthlyCost: input.sowMonthlyCost * 1.15,
      mortalityPercent: Math.min(100, input.mortalityPercent + 3),
      pigletSurvivalPercent: Math.max(0, input.pigletSurvivalPercent - 5),
    },
    base: { ...input },
    favorable: {
      ...input,
      salePricePerKg: input.salePricePerKg * 1.15,
      pigletSalePrice: input.pigletSalePrice * 1.15,
      feedPricePerKg: input.feedPricePerKg * 0.9,
      sowMonthlyCost: input.sowMonthlyCost * 0.9,
      mortalityPercent: Math.max(0, input.mortalityPercent - 2),
      pigletSurvivalPercent: Math.min(100, input.pigletSurvivalPercent + 3),
    },
  };
  return (["prudente", "base", "favorable"] as const).map((name) => ({
    name, result: simulateInvestment(map[name]),
  }));
}

export function estimateRiskBySampling(input: SimulationInputs, iterations = 400) {
  validateSimulationInputs(input);
  if (iterations < 10 || iterations > 5000 || !Number.isInteger(iterations)) {
    throw new RangeError("Iteraciones fuera de rango");
  }
  let seed = 20261020;
  const rand = () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const values: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const priceFactor = 0.85 + 0.3 * rand();
    const feedFactor = 0.85 + 0.3 * rand();
    const mortalityDelta = (rand() - 0.5) * 6;
    const survivalDelta = (rand() - 0.5) * 10;
    const sampled: SimulationInputs = {
      ...input,
      salePricePerKg: input.salePricePerKg * priceFactor,
      pigletSalePrice: input.pigletSalePrice * priceFactor,
      feedPricePerKg: input.feedPricePerKg * feedFactor,
      sowMonthlyCost: input.sowMonthlyCost * feedFactor,
      mortalityPercent: Math.min(100, Math.max(0, input.mortalityPercent + mortalityDelta)),
      pigletSurvivalPercent: Math.min(100, Math.max(0, input.pigletSurvivalPercent + survivalDelta)),
    };
    values.push(simulateInvestment(sampled).netCash);
  }
  values.sort((a,b) => a-b);
  const percentile = (p: number) => values[Math.min(values.length - 1, Math.floor(p * (values.length - 1)))];
  return {
    p10: percentile(0.1),
    median: percentile(0.5),
    p90: percentile(0.9),
    shareWithPositiveCash: money(100 * values.filter(x => x > 0).length / values.length),
    iterations,
  };
}

/**
 * Editable DEMONSTRATION settings only. Not evidence of any user's farm,
 * Venezuelan market prices, biological productivity or validated forecasts.
 */
export const demonstrationInputs: Record<ProjectKind, SimulationInputs> = {
  bovine_fattening: {
    kind: "bovine_fattening", heads: 25, months: 24, cycleMonths: 12,
    entryWeightKg: 220, exitWeightKg: 430, mortalityPercent: 2,
    purchasePerHead: 500, feedConversionRatio: 3, feedPricePerKg: 0.22,
    salePricePerKg: 2.2, otherCostPerHead: 60, fixedCostMonthly: 250,
    infrastructureInvestment: 5000, annualDiscountPercent: 12,
    littersPerSowYear: 2, pigletsBornPerLitter: 9, pigletSurvivalPercent: 90,
    pigletSalePrice: 45, sowMonthlyCost: 40, pigletCostPerHead: 12,
  },
  swine_fattening: {
    kind: "swine_fattening", heads: 100, months: 12, cycleMonths: 5,
    entryWeightKg: 25, exitWeightKg: 105, mortalityPercent: 3,
    purchasePerHead: 55, feedConversionRatio: 3, feedPricePerKg: 0.45,
    salePricePerKg: 2.1, otherCostPerHead: 15, fixedCostMonthly: 300,
    infrastructureInvestment: 6000, annualDiscountPercent: 12,
    littersPerSowYear: 2, pigletsBornPerLitter: 10, pigletSurvivalPercent: 90,
    pigletSalePrice: 45, sowMonthlyCost: 40, pigletCostPerHead: 12,
  },
  swine_breeding: {
    kind: "swine_breeding", heads: 20, months: 24, cycleMonths: 6,
    entryWeightKg: 0, exitWeightKg: 0, mortalityPercent: 0,
    purchasePerHead: 250, feedConversionRatio: 0, feedPricePerKg: 0,
    salePricePerKg: 0, otherCostPerHead: 0, fixedCostMonthly: 250,
    infrastructureInvestment: 7500, annualDiscountPercent: 12,
    littersPerSowYear: 2, pigletsBornPerLitter: 10, pigletSurvivalPercent: 85,
    pigletSalePrice: 50, sowMonthlyCost: 36, pigletCostPerHead: 12,
  },
};
