/**
 * Validate the full workbook before any animal result is written.
 * The caller commits the returned plan in a single tenant-scoped transaction.
 */
export class OperationImportValidationError extends Error {
  readonly code: string;
  readonly rowNumber?: number;
  constructor(code: string, rowNumber?: number) {
    super(rowNumber ? `${code}: fila ${rowNumber}` : code);
    this.code = code;
    this.rowNumber = rowNumber;
    this.name = "OperationImportValidationError";
  }
}

type OperationAnimalCandidate = {
  id: string;
  internalCodeSnapshot: string;
  visualIdentificationSnapshot: string | null;
  appliedToAnimalHistory: boolean;
  animal: { internalCode: string; visualIdentification: string | null; chipCode: string | null };
};

export type PlannedOperationResult = {
  operationAnimalId: string;
  weightKg: string | null;
  vaccineName: string | null;
  dewormingName: string | null;
  treatmentName: string | null;
  observations: string | null;
  generalStatus: "NOT_CHECKED" | "GOOD" | "UNDER_OBSERVATION" | "SICK" | "CRITICAL";
};

function codeValue(value: unknown) {
  return String(value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}
function asText(value: unknown) {
  return String(value ?? "").trim();
}
function firstValue(row: Record<string, unknown>, names: string[]) {
  for (const name of names) {
    if (row[name] !== undefined && asText(row[name])) return asText(row[name]);
  }
  return "";
}
function parseGeneralStatus(value: string, rowNumber: number): PlannedOperationResult["generalStatus"] {
  const key = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
    .toUpperCase().replace(/[ -]+/g, "_");
  const map: Record<string, PlannedOperationResult["generalStatus"]> = {
    "": "NOT_CHECKED", NOT_CHECKED: "NOT_CHECKED", NO_REVISADO: "NOT_CHECKED",
    GOOD: "GOOD", BUENO: "GOOD", SANO: "GOOD",
    UNDER_OBSERVATION: "UNDER_OBSERVATION", OBSERVACION: "UNDER_OBSERVATION", EN_OBSERVACION: "UNDER_OBSERVATION",
    SICK: "SICK", ENFERMO: "SICK",
    CRITICAL: "CRITICAL", CRITICO: "CRITICAL",
  };
  if (!Object.hasOwn(map, key)) throw new OperationImportValidationError("ESTADO_NO_RECONOCIDO", rowNumber);
  return map[key];
}
function parseWeight(value: string, rowNumber: number) {
  if (!value) return null;
  if (!/^\d{1,4}(?:[.,]\d{1,2})?$/.test(value)) {
    throw new OperationImportValidationError("PESO_INVALIDO", rowNumber);
  }
  const number = Number(value.replace(",", "."));
  if (!Number.isFinite(number) || number <= 0 || number > 5000) {
    throw new OperationImportValidationError("PESO_INVALIDO", rowNumber);
  }
  return value.replace(",", ".");
}

export function validateOperationImportRows(
  rows: Record<string, unknown>[],
  animals: OperationAnimalCandidate[],
): PlannedOperationResult[] {
  if (!rows.length) throw new OperationImportValidationError("EXCEL_SIN_RESULTADOS");
  if (rows.length > 20000) throw new OperationImportValidationError("EXCEL_DEMASIADAS_FILAS");
  const columns = Object.keys(rows[0] ?? {});
  if (!columns.some((key) => ["Codigo interno", "Codigo", "codigo interno", "codigo"].includes(key))) {
    throw new OperationImportValidationError("COLUMNA_CODIGO_FALTANTE");
  }
  const byCode = new Map<string, Set<string>>();
  for (const animal of animals) {
    for (const value of [
      animal.internalCodeSnapshot, animal.visualIdentificationSnapshot,
      animal.animal.internalCode, animal.animal.visualIdentification, animal.animal.chipCode,
    ]) {
      const code = codeValue(value);
      if (!code) continue;
      const matches = byCode.get(code) ?? new Set<string>();
      matches.add(animal.id);
      byCode.set(code, matches);
    }
  }
  const matchedAnimals = new Map(animals.map((animal) => [animal.id, animal]));
  const used = new Set<string>();
  const planned: PlannedOperationResult[] = [];

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2;
    const values = Object.values(row).map(asText);
    if (values.every((value) => !value)) continue;
    const original = firstValue(row, ["Codigo interno", "Codigo", "codigo interno", "codigo"]);
    const code = codeValue(original);
    if (!code) throw new OperationImportValidationError("CODIGO_FALTANTE", rowNumber);
    const matches = byCode.get(code);
    if (!matches?.size) throw new OperationImportValidationError("ANIMAL_NO_PERTENECE_A_JORNADA", rowNumber);
    if (matches.size > 1) throw new OperationImportValidationError("IDENTIFICADOR_AMBIGUO", rowNumber);
    const id = [...matches][0];
    if (used.has(id)) throw new OperationImportValidationError("ANIMAL_DUPLICADO", rowNumber);
    const match = matchedAnimals.get(id);
    if (!match || match.appliedToAnimalHistory) {
      throw new OperationImportValidationError("ANIMAL_YA_APLICADO", rowNumber);
    }
    used.add(id);

    const weightKg = parseWeight(firstValue(row, ["Peso nuevo", "Peso"]), rowNumber);
    const vaccineName = firstValue(row, ["Vacuna aplicada", "Vacuna"]) || null;
    const dewormingName = firstValue(row, ["Desparasitacion", "Desparasitante"]) || null;
    const treatmentName = firstValue(row, ["Tratamiento", "Tratamiento aplicado"]) || null;
    const observations = firstValue(row, ["Observaciones", "Observacion"]) || null;
    const generalStatus = parseGeneralStatus(firstValue(row, ["Estado general"]), rowNumber);

    if ([vaccineName, dewormingName, treatmentName].some((field) => field && field.length > 120) ||
      (observations && observations.length > 400)) {
      throw new OperationImportValidationError("TEXTO_EXCEDE_LIMITE", rowNumber);
    }
    if (!weightKg && !vaccineName && !dewormingName && !treatmentName &&
      !observations && generalStatus === "NOT_CHECKED") {
      // The downloadable template includes one empty row for every animal;
      // blank results must not be marked as captured.
      continue;
    }
    planned.push({
      operationAnimalId: id, weightKg, vaccineName, dewormingName,
      treatmentName, observations, generalStatus,
    });
  }
  if (!planned.length) throw new OperationImportValidationError("EXCEL_SIN_RESULTADOS");
  return planned;
}
