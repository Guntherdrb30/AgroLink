/**
 * Pure, deterministic preselection of cattle for internal sale guides.
 * All weights come from the latest dated individual weighing supplied by the caller.
 * Approximating a total in kilograms never creates a sale or authorizes a movement.
 */

export type SaleCandidate = { id: string; code: string; kg: number };
export type SaleSelectionRequest =
  | { kind: "quantity"; count: number }
  | { kind: "targetKg"; targetKg: number }
  | { kind: "all" };
export type SaleSelection = {
  animals: SaleCandidate[];
  count: number;
  totalKg: number;
  differenceKg: number | null;
  targetKg: number | null;
  maxAvailableKg: number;
  targetReachable: boolean;
  availableCount: number;
};

export const MAX_ANIMALS_PER_GUIDE = 100;
const precision = (n: number) => Math.round(n * 100);
const fromPrecision = (n: number) => n / 100;

export function parseSpanishNumber(raw: string): number | null {
  let text = raw.trim().toLowerCase();
  const thousandsWord = /\s+mil$/.test(text);
  if (thousandsWord) text = text.replace(/\s+mil$/, "");
  if (!/^\d+(?:[.,]\d+)*(?:\s+\d{3})*$/.test(text)) return null;
  text = text.replace(/\s+/g, "");
  const comma = text.lastIndexOf(",");
  const dot = text.lastIndexOf(".");
  let normalized: string;
  if (comma >= 0 && dot >= 0) {
    const decimalPosition = Math.max(comma, dot);
    const integer = text.slice(0, decimalPosition).replace(/[.,]/g, "");
    const fractional = text.slice(decimalPosition + 1);
    if (!/^\d+$/.test(integer) || !/^\d{1,3}$/.test(fractional)) return null;
    normalized = integer + "." + fractional;
  } else {
    const chunks = text.split(/[.,]/);
    if (chunks.length > 2) {
      if (!chunks.slice(1).every(c => c.length === 3)) return null;
      normalized = chunks.join("");
    } else if (chunks.length === 2) {
      const [whole, fraction] = chunks;
      normalized = fraction.length === 3 && whole.length <= 3 && whole !== "0"
        ? whole + fraction
        : whole + "." + fraction;
    } else normalized = text;
  }
  const value = Number(normalized) * (thousandsWord ? 1000 : 1);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export function numberFromText(text: string): number | null {
  const match = text.toLowerCase().match(/\d+(?:[.,]\d+)*(?:\s+\d{3})*(?:\s+mil)?/);
  return match ? parseSpanishNumber(match[0]) : null;
}

export function parseSaleSelection(text: string): SaleSelectionRequest | null {
  const message = text.toLocaleLowerCase("es")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/\b(todos|todas)\b/.test(message) && !/\d/.test(message)) return { kind: "all" };
  const animalCount = message.match(/(\d+(?:[.,]\d+)*)\s*(?:animales?|cabezas?|reses)\b/);
  if (animalCount) {
    const count = parseSpanishNumber(animalCount[1]);
    return count !== null && Number.isSafeInteger(count) ? { kind: "quantity", count } : null;
  }
  const value = numberFromText(message);
  if (value === null) return null;
  const hasKg = /\b(?:kg|kilos?|kilogramos?)\b/.test(message);
  const hasMil = /\bmil\b/.test(message);
  const targetLanguage = /\b(?:peso total|en total|total de kilos|objetivo|aproximadamente|aproximado|aprox)\b/.test(message);
  const groupedThousands = /\d[.,]\d{3}(?:\D|$)/.test(message);
  if (hasKg || hasMil || targetLanguage || groupedThousands || value > MAX_ANIMALS_PER_GUIDE) {
    return { kind: "targetKg", targetKg: value };
  }
  return Number.isSafeInteger(value) ? { kind: "quantity", count: value } : null;
}

function orderedCandidates(animals: readonly SaleCandidate[]): SaleCandidate[] {
  return animals.filter(a =>
    typeof a.id === "string" && a.id &&
    Number.isFinite(a.kg) && a.kg > 0 &&
    Number.isSafeInteger(precision(a.kg)),
  ).slice().sort((a, b) =>
    b.kg - a.kg || a.code.localeCompare(b.code) || a.id.localeCompare(b.id),
  );
}

export function selectSaleAnimals(
  source: readonly SaleCandidate[],
  request: SaleSelectionRequest,
  limit = MAX_ANIMALS_PER_GUIDE,
): SaleSelection {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_ANIMALS_PER_GUIDE) {
    throw new Error("INVALID_GUIDE_LIMIT");
  }
  const available = orderedCandidates(source);
  const limitCount = Math.min(limit, available.length);
  const pool = available.slice(0, limitCount);
  const maxCentiKg = pool.reduce((sum, item) => sum + precision(item.kg), 0);
  const base = {
    targetKg: request.kind === "targetKg" ? request.targetKg : null,
    maxAvailableKg: fromPrecision(maxCentiKg),
    availableCount: available.length,
  };
  if (request.kind === "quantity" || request.kind === "all") {
    const count = request.kind === "all" ? available.length : request.count;
    if (!Number.isSafeInteger(count) || count < 1 || count > limit ||
        count > available.length) throw new Error("INVALID_GUIDE_COUNT");
    const selected = available.slice(0, count);
    return {
      ...base, animals: selected, count,
      totalKg: fromPrecision(selected.reduce((sum, a) => sum + precision(a.kg), 0)),
      differenceKg: null, targetReachable: true,
    };
  }
  const target = request.targetKg;
  if (!Number.isFinite(target) || target <= 0 || target > 1_000_000 ||
      !Number.isSafeInteger(precision(target))) throw new Error("INVALID_KG_TARGET");
  const goal = precision(target);
  if (!available.length || goal > maxCentiKg) {
    return {
      ...base, animals: [], count: 0, totalKg: 0,
      differenceKg: null, targetReachable: false,
    };
  }
  const grams = available.map(a => precision(a.kg));
  // Start with the closest highest-weight prefix, preferring heavy animals
  // when two selections are equally close.
  let total = 0;
  let bestCount = 0;
  let bestDelta = Number.POSITIVE_INFINITY;
  for (let i = 0; i < limitCount; i++) {
    total += grams[i];
    const delta = Math.abs(total - goal);
    if (delta < bestDelta) {
      bestDelta = delta;
      bestCount = i + 1;
    }
    if (delta === 0) break;
  }
  const chosen = new Set<number>();
  for (let i = 0; i < bestCount; i++) chosen.add(i);
  let chosenSum = grams.slice(0, bestCount).reduce((sum, n) => sum + n, 0);

  // Bounded refinement: a small number of deterministic add/remove/replace
  // steps improves proximity while never exceeding 100 animals per guide.
  for (let pass = 0; pass < 5 && chosenSum !== goal; pass++) {
    let best: null | { remove: number | null; add: number | null; sum: number } = null;
    let error = Math.abs(chosenSum - goal);
    const consider = (remove: number | null, add: number | null, sum: number) => {
      const nextError = Math.abs(sum - goal);
      if (nextError < error) {
        error = nextError;
        best = { remove, add, sum };
      }
    };
    if (chosen.size > 1) for (const idx of chosen) consider(idx, null, chosenSum - grams[idx]);
    if (chosen.size < limit) for (let idx = 0; idx < grams.length; idx++) {
      if (!chosen.has(idx)) consider(null, idx, chosenSum + grams[idx]);
    }
    for (const removed of chosen) {
      for (let added = 0; added < grams.length; added++) {
        if (!chosen.has(added)) consider(removed, added, chosenSum - grams[removed] + grams[added]);
      }
    }
    if (!best) break;
    const step: { remove: number | null; add: number | null; sum: number } = best;
    if (step.remove !== null) chosen.delete(step.remove);
    if (step.add !== null) chosen.add(step.add);
    chosenSum = step.sum;
  }
  const selected = [...chosen].sort((a, b) => a - b).map(i => available[i]);
  return {
    ...base, animals: selected, count: selected.length,
    totalKg: fromPrecision(chosenSum),
    differenceKg: fromPrecision(chosenSum - goal),
    targetReachable: true,
  };
}
