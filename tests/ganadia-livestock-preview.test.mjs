import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const XLSX = require("xlsx");
import { previewLivestockWorkbook, MAX_PREVIEW_BYTES } from "../lib/imports/livestock-preview.ts";

function file(rows) {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario");
  return new Uint8Array(XLSX.write(workbook, { type: "array", bookType: "xlsx" }));
}

test("Valid bovine inventory is previewed, never saved", () => {
  const data = previewLivestockWorkbook(file([
    ["Codigo interno", "Especie", "Raza", "Sexo", "Peso kg", "Lote"],
    ["A-001", "Bovino", "Brahman", "Macho", "450", "Norte"],
    ["A-002", "Bovino", "Holstein", "Hembra", "340", "Sur"],
  ]), "hato.xlsx");
  assert.equal(data.status, "PREVIEW_ONLY");
  assert.equal(data.rowCount, 2);
  assert.equal(data.validRows, 2);
  assert.equal(data.issueCount, 0);
  assert.equal(data.previewRows[0].internalCode, "A-001");
});

test("Duplicated animal codes and invalid data are surfaced", () => {
  const data = previewLivestockWorkbook(file([
    ["Codigo", "Sexo", "Peso"],
    ["TORO-1", "Macho", "510"],
    ["toro 1", "otro", "-1"],
    ["", "Hembra", "120"],
  ]), "inventario.xlsx");
  assert.ok(data.issues.some(i => i.code === "DUPLICATE_CODE"));
  assert.ok(data.issues.some(i => i.code === "UNRECOGNIZED_SEX"));
  assert.ok(data.issues.some(i => i.code === "INVALID_WEIGHT"));
  assert.ok(data.issues.some(i => i.code === "REQUIRED_CODE"));
});

test("Preview enforces file limits and mandatory animal code", () => {
  assert.throws(() => previewLivestockWorkbook(new Uint8Array(MAX_PREVIEW_BYTES + 1), "a.xlsx"), /INVALID_PREVIEW_FILE_SIZE/);
  assert.throws(() => previewLivestockWorkbook(file([["Raza"], ["Brahman"]]), "hato.xlsx"), /ANIMAL_CODE_HEADER_REQUIRED/);
  assert.throws(() => previewLivestockWorkbook(file([["Codigo"], ["A"]]), "macro.xlsm"), /UNSUPPORTED_PREVIEW_EXTENSION/);
});
