/** Orden y edad del inventario ganadero. No modifica los registros originales. */
export type AnimalInventorySortMode = "age-desc" | "age-asc" | "code-asc" | "code-desc";

export type AnimalInventoryAge = {
  id: string;
  internalCode: string;
  birthDate: string | null;
  estimatedAgeMonths: number | null;
};

const naturalCode = new Intl.Collator("es", { numeric: true, sensitivity: "base" });
const DAY_MS = 86_400_000;
const MEAN_DAYS_PER_MONTH = 365.2425 / 12;

function utcDay(iso: string | null): number | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const date = new Date(iso + "T00:00:00.000Z");
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== iso) return null;
  return date.getTime() / DAY_MS;
}

/** La fecha de nacimiento prevalece sobre edades estimadas. Los datos desconocidos van al final. */
export function animalAgeInDays(animal: Pick<AnimalInventoryAge, "birthDate" | "estimatedAgeMonths">, todayIso: string): number | null {
  const today = utcDay(todayIso);
  if (today === null) return null;
  const birth = utcDay(animal.birthDate);
  if (birth !== null && birth <= today) return today - birth;
  if (animal.estimatedAgeMonths !== null &&
      Number.isFinite(animal.estimatedAgeMonths) &&
      animal.estimatedAgeMonths >= 0) {
    return animal.estimatedAgeMonths * MEAN_DAYS_PER_MONTH;
  }
  return null;
}

export function formatAnimalInventoryAge(
  animal: Pick<AnimalInventoryAge, "birthDate" | "estimatedAgeMonths">,
  todayIso: string,
): string {
  const ageDays = animalAgeInDays(animal, todayIso);
  if (ageDays === null) return "Sin edad";
  const birthDay = utcDay(animal.birthDate);
  const today = utcDay(todayIso);
  let months: number;
  let estimated = true;
  if (birthDay !== null && today !== null && birthDay <= today) {
    const birth = new Date(birthDay * DAY_MS);
    const current = new Date(today * DAY_MS);
    months = (current.getUTCFullYear() - birth.getUTCFullYear()) * 12
      + (current.getUTCMonth() - birth.getUTCMonth())
      - (current.getUTCDate() < birth.getUTCDate() ? 1 : 0);
    estimated = false;
  } else {
    months = Math.floor(animal.estimatedAgeMonths ?? 0);
  }
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  const result = months === 0 ? "Menos de 1 mes" :
    years === 0 ? `${months} ${months === 1 ? "mes" : "meses"}` :
    remainingMonths === 0 ? `${years} ${years === 1 ? "año" : "años"}` :
    `${years} ${years === 1 ? "año" : "años"} ${remainingMonths} ${remainingMonths === 1 ? "mes" : "meses"}`;
  return estimated ? "≈ " + result : result;
}

/** Orden alfabético natural: BOV-2 antecede a BOV-10. */
export function sortAnimalInventory<T extends AnimalInventoryAge>(
  input: readonly T[],
  mode: AnimalInventorySortMode,
  todayIso: string,
): T[] {
  const rankByCode = (a: T, b: T) =>
    naturalCode.compare(a.internalCode, b.internalCode) || a.id.localeCompare(b.id);
  return [...input].sort((a, b) => {
    if (mode === "code-asc") return rankByCode(a, b);
    if (mode === "code-desc") return -rankByCode(a, b);
    const ageA = animalAgeInDays(a, todayIso);
    const ageB = animalAgeInDays(b, todayIso);
    if (ageA === null && ageB !== null) return 1;
    if (ageA !== null && ageB === null) return -1;
    if (ageA !== null && ageB !== null && ageA !== ageB)
      return mode === "age-desc" ? ageB - ageA : ageA - ageB;
    return rankByCode(a, b);
  });
}
