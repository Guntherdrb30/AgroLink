import { parseSpanishNumber, selectSaleAnimals, type SaleCandidate, type SaleSelection } from "./ganadia-sale-selection.ts";

/**
 * Deterministic authorized-farm comparison. No external model, no writes.
 * Farm inventories must already be filtered to active, authorized cattle with
 * dated measured weights at/above the stated per-animal threshold.
 */
export type FarmPool = {
  id: string;
  name: string;
  animals: readonly SaleCandidate[];
};
export type FarmCapacity = {
  id: string;
  name: string;
  count: number;
  availableKg: number;
  maxGuideKg: number;
  canMeetTarget: boolean;
  proposal: SaleSelection;
};
export type Comparison = {
  farms: FarmCapacity[];
  recommendedId: string | null;
  capableCount: number;
};

export function extractTargetKilograms(
  message: string,
  recentHistory: readonly { role: string; content: string }[] = [],
): number | null {
  function fromOne(text: string): number | null {
    const numbers = text.match(/\b\d+(?:[.,]\d+)*(?:\s+\d{3})*(?:\s+mil)?\b/gi) || [];
    const goals = numbers
      .map(value => parseSpanishNumber(value))
      .filter((n): n is number =>
        n !== null && Number.isSafeInteger(Math.round(n * 100)) &&
        n >= 1000 && n <= 1_000_000,
      );
    // A 450-kg individual threshold is not a total-kilogram target.
    return goals.length ? Math.max(...goals) : null;
  }
  const current = fromOne(message);
  if (current !== null) return current;
  for (const turn of [...recentHistory].reverse()) {
    if (turn.role !== "user") continue;
    const value = fromOne(turn.content);
    if (value !== null) return value;
  }
  return null;
}

export function wantsFarmComparison(message: string): boolean {
  const value = message.toLocaleLowerCase("es")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return /\b(cual|cuales|compara|comparar|revisa|revisar|comprueba|verifica|ver|cumple|cumplir|alcanza|alcanzar|suficiente|suficientes|una sola|de una sola|que finca|cual finca|elige|elegir|recomienda|recomendar)\b/.test(value);
}

export function acceptsRecommendedFarm(message: string): boolean {
  const value = message.trim().toLocaleLowerCase("es")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[.!?]+$/,"").trim();
  return /^(si|ok|dale|adelante|continuar|continua|seguimos|esa|esa finca|la recomendada|la que alcance|la que cumpla|elige tu|elige la que cumpla|elige la que alcance|perfecto|de acuerdo|vamos con esa|procedamos|hazlo)$/.test(value);
}

export function compareAuthorizedFarmCapacity(
  farmPools: readonly FarmPool[], targetKg: number,
): Comparison {
  if (!Number.isFinite(targetKg) || targetKg < 1 || targetKg > 1_000_000) {
    throw new Error("INVALID_KG_TARGET");
  }
  const farms = farmPools.map(farm => {
    const proposal = selectSaleAnimals(farm.animals, {kind:"targetKg",targetKg});
    const availableCentiKg = farm.animals.reduce((sum, a) =>
      sum + Math.round(a.kg * 100), 0);
    return {
      id:farm.id,
      name:farm.name,
      count:farm.animals.length,
      availableKg:availableCentiKg/100,
      maxGuideKg:proposal.maxAvailableKg,
      canMeetTarget:proposal.targetReachable,
      proposal,
    };
  });
  const choices=farms.filter(f => f.canMeetTarget).sort((a,b) =>
    Math.abs(a.proposal.differenceKg ?? Infinity) - Math.abs(b.proposal.differenceKg ?? Infinity) ||
    a.proposal.count - b.proposal.count ||
    a.name.localeCompare(b.name,"es"),
  );
  return {farms,recommendedId:choices[0]?.id??null,capableCount:choices.length};
}
