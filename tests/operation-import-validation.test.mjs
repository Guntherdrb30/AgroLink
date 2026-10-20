import assert from "node:assert/strict";
import { test } from "node:test";
import { validateOperationImportRows, OperationImportValidationError } from "../lib/operations/validate-import-rows.ts";

const animals = [
  { id: "a1", internalCodeSnapshot: "BOV-001", visualIdentificationSnapshot: "0101", appliedToAnimalHistory: false,
    animal: { internalCode: "BOV-001", visualIdentification: "0101", chipCode: null } },
  { id: "a2", internalCodeSnapshot: "BOV-002", visualIdentificationSnapshot: "0102", appliedToAnimalHistory: false,
    animal: { internalCode: "BOV-002", visualIdentification: "0102", chipCode: null } },
];
function codeRows(codes) { return codes.map(code => ({ "Codigo interno": code, "Peso nuevo": "420,5", "Estado general": "Bueno" })); }
function rejects(rows, expected, candidates = animals) {
  assert.throws(() => validateOperationImportRows(rows, candidates), err =>
    err instanceof OperationImportValidationError && err.code === expected);
}
test("Valid results map by code, preserve decimal and normalize status", () => {
  const rows = validateOperationImportRows(codeRows(["BOV-001", "BOV-002"]), animals);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].operationAnimalId, "a1");
  assert.equal(rows[0].weightKg, "420.5");
  assert.equal(rows[1].generalStatus, "GOOD");
});
test("Empty template rows are ignored instead of marking every animal captured", () => {
  const rows = validateOperationImportRows([
    { "Codigo interno": "BOV-001", "Peso nuevo": "", "Estado general": "" },
    { "Codigo interno": "BOV-002", "Peso nuevo": "375", "Estado general": "Sano" },
  ], animals);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].operationAnimalId, "a2");
});
test("Unknown and duplicate rows stop whole import", () => {
  rejects(codeRows(["BOV-001", "NO-EXISTE"]), "ANIMAL_NO_PERTENECE_A_JORNADA");
  rejects(codeRows(["BOV-001", "BOV-001"]), "ANIMAL_DUPLICADO");
});
test("Conflicting identifiers are rejected instead of picking the first animal", () => {
  const conflicted = structuredClone(animals);
  conflicted[1].visualIdentificationSnapshot = "0101";
  rejects(codeRows(["0101"]), "IDENTIFICADOR_AMBIGUO", conflicted);
});
test("Invalid values fail before any database write", () => {
  rejects([{ "Codigo interno": "BOV-001", "Peso nuevo": "-30" }], "PESO_INVALIDO");
  rejects([{ "Codigo interno": "BOV-001", "Estado general": "NO_VALIDO" }], "ESTADO_NO_RECONOCIDO");
  rejects([{ "Codigo interno": "BOV-001", "Observaciones": "A".repeat(401) }], "TEXTO_EXCEDE_LIMITE");
  rejects([{ "Codigo interno": "", "Peso nuevo": "400" }], "CODIGO_FALTANTE");
});
test("Previously applied animals, missing headers and blank files fail safely", () => {
  rejects(codeRows(["BOV-001"]), "ANIMAL_YA_APLICADO", [{ ...animals[0], appliedToAnimalHistory: true }]);
  rejects([{ "Sin codigo": "BOV-001" }], "COLUMNA_CODIGO_FALTANTE");
  rejects([{ "Codigo interno": "BOV-001", "Peso nuevo": "" }], "EXCEL_SIN_RESULTADOS");
  rejects([], "EXCEL_SIN_RESULTADOS");
});
