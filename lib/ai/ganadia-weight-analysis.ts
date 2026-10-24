/**
 * Pure, deterministic weight analysis for authorized livestock records.
 * Never changes ERP data, never equates a model projection with a physical weighing.
 */
export type AnimalWeightObservation = { kg: number; recordedAt: Date | string };
export type LivestockWeightInput = {
  code: string;
  farmName: string;
  fichaKg: number | null;
  observations: readonly AnimalWeightObservation[];
};
export type LivestockWeightResult = {
  code: string;
  farmName: string;
  fichaKg: number | null;
  latestKg: number | null;
  latestDate: string | null;
  previousKg: number | null;
  previousDate: string | null;
  daysSince: number | null;
  gainKgPerDay: number | null;
  estimatedTodayKg: number | null;
  estimatedIn30DaysKg: number | null;
  measuredAboveThreshold: boolean;
  fichaAboveThreshold: boolean;
  estimatedTodayCrossing: boolean;
  projected30DaysCrossing: boolean;
};

const MS_PER_DAY = 86_400_000;
export const MIN_GAIN_INTERVAL_DAYS = 14;
export const MAX_GAIN_INTERVAL_DAYS = 180;
export const MAX_PROJECTION_DAYS = 60;
export const MAX_PLAUSIBLE_GAIN_KG_PER_DAY = 2.5;
export const PROJECTION_HORIZON_DAYS = 30;

function dayFromDate(value: string | Date): number | null {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / MS_PER_DAY);
}

function numericWeight(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > 2500) return null;
  return value;
}
function isoDate(day: number): string {
  return new Date(day * MS_PER_DAY).toISOString().slice(0, 10);
}

export function analyzeAnimalWeight(
  input: LivestockWeightInput, referenceDate: Date, minimumKg: number,
): LivestockWeightResult {
  if (!Number.isFinite(minimumKg) || minimumKg < 1 || minimumKg > 2000) throw new Error("INVALID_WEIGHT");
  const today = dayFromDate(referenceDate);
  if (today === null) throw new Error("INVALID_DATE");
  const records = input.observations.flatMap(observation => {
    const day = dayFromDate(observation.recordedAt);
    const kg = numericWeight(observation.kg);
    return day !== null && day <= today && kg !== null ? [{ day, kg }] : [];
  }).sort((a, b) => b.day - a.day);
  const latest = records[0];
  const latestKg = latest?.kg ?? null;
  const daysSince = latest ? today - latest.day : null;
  const previous = latest ? records.find(record =>
    latest.day - record.day >= MIN_GAIN_INTERVAL_DAYS &&
    latest.day - record.day <= MAX_GAIN_INTERVAL_DAYS,
  ) : undefined;
  const priorDays = latest && previous ? latest.day - previous.day : null;
  const gainKgPerDay = latest && previous && priorDays
    ? (latest.kg - previous.kg) / priorDays : null;
  const canProject = latest !== undefined && daysSince !== null &&
    daysSince >= 0 && daysSince <= MAX_PROJECTION_DAYS &&
    gainKgPerDay !== null &&
    gainKgPerDay >= 0 && gainKgPerDay <= MAX_PLAUSIBLE_GAIN_KG_PER_DAY;
  const estimatedTodayKg = canProject && latest
    ? latest.kg + gainKgPerDay! * daysSince! : null;
  const estimatedIn30DaysKg = canProject && latest &&
    daysSince! + PROJECTION_HORIZON_DAYS <= MAX_PROJECTION_DAYS
    ? latest.kg + gainKgPerDay! * (daysSince! + PROJECTION_HORIZON_DAYS) : null;
  const fichaKg = input.fichaKg !== null ? numericWeight(input.fichaKg) : null;
  return {
    code: input.code,
    farmName: input.farmName,
    fichaKg,
    latestKg,
    latestDate: latest ? isoDate(latest.day) : null,
    previousKg: previous?.kg ?? null,
    previousDate: previous ? isoDate(previous.day) : null,
    daysSince,
    gainKgPerDay,
    estimatedTodayKg,
    estimatedIn30DaysKg,
    measuredAboveThreshold: latestKg !== null && latestKg >= minimumKg,
    fichaAboveThreshold: fichaKg !== null && fichaKg >= minimumKg,
    estimatedTodayCrossing: latestKg !== null && latestKg < minimumKg &&
      estimatedTodayKg !== null && estimatedTodayKg >= minimumKg,
    projected30DaysCrossing: latestKg !== null && latestKg < minimumKg &&
      estimatedIn30DaysKg !== null && estimatedIn30DaysKg >= minimumKg,
  };
}
