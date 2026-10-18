import assert from "node:assert/strict";
import { test } from "node:test";
import { previewLivestockWorkbook, MAX_PREVIEW_BYTES, assertReasonableXlsxZip } from "../lib/imports/livestock-preview.ts";

const csv = (rows) => new TextEncoder().encode(rows.map(r => r.join(",")).join("\n"));

test("Valid bovine inventory is previewed, never saved", async () => {
  const data = await previewLivestockWorkbook(csv([
    ["Codigo interno", "Especie", "Raza", "Sexo", "Peso kg", "Lote"],
    ["A-001", "Bovino", "Brahman", "Macho", "450", "Norte"],
    ["A-002", "Bovino", "Holstein", "Hembra", "340", "Sur"],
  ]), "hato.csv");
  assert.equal(data.status, "PREVIEW_ONLY");
  assert.equal(data.validRows, 2);
  assert.equal(data.previewRows[0].internalCode, "A-001");
});

test("Duplicates, bad weight and sex are flagged", async () => {
  const data = await previewLivestockWorkbook(csv([
    ["Codigo", "Sexo", "Peso"],
    ["TORO-1", "Macho", "510"],
    ["toro 1", "otro", "-1"],
    ["", "Hembra", "120"],
  ]), "hato.csv");
  for (const expected of ["DUPLICATE_CODE", "UNRECOGNIZED_SEX", "INVALID_WEIGHT", "REQUIRED_CODE"]) {
    assert.ok(data.issues.some(i => i.code === expected));
  }
});

test("Manual mapping is supported and duplicate mapping forbidden", async () => {
  const bytes = csv([["Mi identificador", "Clase", "Peso"], ["ABC-1", "Bovino", "200"]]);
  const data = await previewLivestockWorkbook(bytes, "hato.csv", { internalCode: 0, species: 1 });
  assert.equal(data.validRows, 1);
  assert.equal(data.mapping.internalCode, "Mi identificador");
  await assert.rejects(previewLivestockWorkbook(bytes, "hato.csv", { internalCode: 0, species: 0 }), /DUPLICATE_COLUMN_MAPPING/);
});

test("Reject invalid extension, archive and oversized input", async () => {
  await assert.rejects(previewLivestockWorkbook(new Uint8Array(MAX_PREVIEW_BYTES + 1), "a.csv"), /INVALID_PREVIEW_FILE_SIZE/);
  await assert.rejects(previewLivestockWorkbook(csv([["Codigo"], ["A"]]), "macro.xlsm"), /UNSUPPORTED_PREVIEW_EXTENSION/);
  assert.throws(() => assertReasonableXlsxZip(new Uint8Array(128)), /UNSAFE_PREVIEW_ARCHIVE/);
});
