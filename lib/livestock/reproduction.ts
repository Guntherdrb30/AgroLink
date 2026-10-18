export const REPRODUCTION_KINDS = ["SERVICE", "PREGNANCY_CHECK", "CALVING", "FOLLOW_UP"] as const;
export type ReproductionKind = (typeof REPRODUCTION_KINDS)[number];
export type PregnancyResult = "POSITIVE" | "NEGATIVE" | "INCONCLUSIVE";

export type ReproductionMetadata = {
  module: "GANADIA_REPRODUCTION";
  kind: ReproductionKind;
  method?: "NATURAL" | "INSEMINATION";
  result?: PregnancyResult;
  sireCode?: string;
  calfCode?: string;
  nextCheckAt?: string;
  expectedCalvingAt?: string;
  stateAfter?: "OPEN" | "PREGNANT" | "LACTATING" | "BREEDING_MALE" | "CASTRATED" | "YOUNG" | "UNKNOWN";
};

export const REPRODUCTION_LABELS: Record<ReproductionKind, string> = {
  SERVICE: "Servicio o inseminación",
  PREGNANCY_CHECK: "Diagnóstico de gestación",
  CALVING: "Parto",
  FOLLOW_UP: "Control reproductivo",
};

export function isReproductionMetadata(value: unknown): value is ReproductionMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return item.module === "GANADIA_REPRODUCTION" &&
    typeof item.kind === "string" &&
    (REPRODUCTION_KINDS as readonly string[]).includes(item.kind);
}

export type ReproductionRecord = {
  id: string;
  dateIso: string;
  createdAtIso: string;
  note: string | null;
  actorName: string | null;
  details: ReproductionMetadata;
};

export function reproductiveStatusAfter(
  current: "OPEN" | "PREGNANT" | "LACTATING" | "BREEDING_MALE" | "CASTRATED" | "YOUNG" | "UNKNOWN",
  kind: ReproductionKind,
  result?: PregnancyResult,
) {
  if (kind === "SERVICE") return "OPEN" as const;
  if (kind === "PREGNANCY_CHECK" && result === "POSITIVE") return "PREGNANT" as const;
  if (kind === "PREGNANCY_CHECK" && result === "NEGATIVE") return "OPEN" as const;
  if (kind === "CALVING") return "LACTATING" as const;
  return current;
}

/**
 * Only the latest reproductive event controls the next action. Older pending
 * dates do not remain active after a later recorded follow-up or diagnosis.
 */
export function getNextReproductionCheck(events: ReproductionRecord[]) {
  const latest = [...events].sort((a, b) =>
    b.dateIso.localeCompare(a.dateIso) || b.createdAtIso.localeCompare(a.createdAtIso),
  )[0];
  return latest?.details.nextCheckAt ?? null;
}
