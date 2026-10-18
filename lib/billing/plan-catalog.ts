/**
 * Preliminary GanadIA MVP subscription tiers.
 * Catalogue only: no payments, provisioning or database writes happen here.
 * Prices and credits require final commercial approval before checkout is enabled.
 */
export const GANADIA_PLANS = [
  { code: "ESENCIAL", name: "Esencial", minActiveAnimals: 0, maxActiveAnimals: 99, monthlyUsd: 29, monthlyAiCredits: 300 },
  { code: "PRODUCTIVA", name: "Productiva", minActiveAnimals: 100, maxActiveAnimals: 299, monthlyUsd: 79, monthlyAiCredits: 1000 },
  { code: "INTEGRAL", name: "Integral", minActiveAnimals: 300, maxActiveAnimals: 1500, monthlyUsd: 149, monthlyAiCredits: 2000 },
  { code: "PROFESIONAL", name: "Profesional", minActiveAnimals: 1501, maxActiveAnimals: 3000, monthlyUsd: 249, monthlyAiCredits: 4000 },
  { code: "CORPORATIVO", name: "Corporativo", minActiveAnimals: 3001, maxActiveAnimals: null, monthlyUsd: null, monthlyAiCredits: null },
] as const;

export type GanadiaPlanCode = (typeof GANADIA_PLANS)[number]["code"];

export function recommendPlanForAnimalCount(activeAnimals: number) {
  if (!Number.isSafeInteger(activeAnimals) || activeAnimals < 0) {
    throw new Error("INVALID_ACTIVE_ANIMAL_COUNT");
  }
  const match = GANADIA_PLANS.find(
    (plan) =>
      activeAnimals >= plan.minActiveAnimals &&
      (plan.maxActiveAnimals === null || activeAnimals <= plan.maxActiveAnimals),
  );
  if (!match) throw new Error("GANADIA_PLAN_NOT_FOUND");
  return match;
}

export function getGanadiaPlan(code: GanadiaPlanCode) {
  const plan = GANADIA_PLANS.find((item) => item.code === code);
  if (!plan) throw new Error("GANADIA_PLAN_NOT_FOUND");
  return plan;
}

/**
 * Do not reject livestock birth, entry, sale, weighing or health updates when
 * the animal count exceeds a commercial tier. Only flag an upgrade review.
 */
export function needsPlanUpgrade(code: GanadiaPlanCode, activeAnimals: number) {
  if (!Number.isSafeInteger(activeAnimals) || activeAnimals < 0) {
    throw new Error("INVALID_ACTIVE_ANIMAL_COUNT");
  }
  const max = getGanadiaPlan(code).maxActiveAnimals;
  return max !== null && activeAnimals > max;
}
