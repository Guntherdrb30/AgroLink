import { parse as parseCsv } from "csv-parse/sync";
import { readSheet } from "read-excel-file/node";

/**
 * Preview only; no persistence, no AI and no external file storage.
 * Untrusted CSV and XLSX are parsed with strict input/ZIP size caps.
 */
export const MAX_PREVIEW_BYTES = 2 * 1024 * 1024;
export const MAX_PREVIEW_ROWS = 500;
const MAX_INFLATED_BYTES = 16 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 120;

export const IMPORT_FIELDS = {
  internalCode: "Código interno",
  species: "Especie",
  breed: "Raza",
  sex: "Sexo",
  initialWeight: "Peso (kg)",
  productiveLine: "Línea productiva",
  birthDate: "Nacimiento",
  lot: "Lote / potrero",
  visualId: "Identificación visual",
} as const;
export type Field = keyof typeof IMPORT_FIELDS;
export type MappingOverrides = Partial<Record<Field, number | null>>;

const ALIASES: Record<Field, string[]> = {
  internalCode: ["codigo", "codigo animal", "codigo interno", "id animal", "identificador", "numero", "nro", "arete", "caravana"],
  species: ["especie", "tipo animal", "tipo de animal"],
  breed: ["raza"],
  sex: ["sexo", "genero"],
  initialWeight: ["peso", "peso kg", "peso inicial", "peso actual", "peso en kg"],
  productiveLine: ["linea", "linea productiva", "proposito", "actividad"],
  birthDate: ["nacimiento", "fecha de nacimiento", "fecha nacimiento"],
  lot: ["lote", "potrero", "grupo", "zona"],
  visualId: ["identificacion", "identificacion visual", "numero de arete"],
};

export type PreviewIssue = { row: number; field: string; code: string };
export type PreviewRow = {
  sourceRow: number;
  internalCode: string;
  species: string;
  breed: string;
  sex: string;
  initialWeight: string;
  productiveLine: string;
  birthDate: string;
  lot: string;
  issues: PreviewIssue[];
};
export type LivestockPreview = {
  status: "PREVIEW_ONLY";
  sheetName: string;
  headers: string[];
  mapping: Partial<Record<Field, string>>;
  mappingPositions: Partial<Record<Field, number>>;
  unknownHeaders: string[];
  rowCount: number;
  validRows: number;
  issueCount: number;
  issues: PreviewIssue[];
  previewRows: PreviewRow[];
  truncated: boolean;
  warnings: string[];
  checkedExistingCodes?: boolean;
  /** Internal-only comparison input; strip from HTTP response. */
  candidateCodes: Array<{ row: number; code: string; valid: boolean }>;
  importRows: Array<{ row: number; code: string; species: string; breed: string; sex: string; weight: string; productiveLine: string; birthDate: string; lot: string; valid: boolean }>;
};

function norm(value: unknown) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ");
}
function cellText(value: unknown) {
  const v = value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? "");
  return v.trim().slice(0, 256);
}
function getCell(row: unknown[], pos: number | undefined) {
  return pos === undefined ? "" : cellText(row[pos]);
}
function fieldForHeader(label: string): Field | undefined {
  const n = norm(label);
  return (Object.keys(ALIASES) as Field[]).find(field => ALIASES[field].includes(n));
}
function validWeight(weight: string) {
  const n = Number(weight.replace(/\s/g, "").replace(",", "."));
  return weight.trim() !== "" && Number.isFinite(n) && n > 0 && n <= 5000;
}

/** Shared normalization: previews and commits must enforce identical rules. */
export function normalizeImportProductiveLine(raw: string):
  "BEEF" | "DAIRY" | "DUAL_PURPOSE" | "BREEDING" | "WORK" | "OTHER" | null {
  const value = norm(raw);
  if (!value) return "OTHER";
  if (["ceba", "carne", "engorde"].includes(value)) return "BEEF";
  if (["leche", "lechero"].includes(value)) return "DAIRY";
  if (["doble proposito"].includes(value)) return "DUAL_PURPOSE";
  if (["cria", "reproduccion"].includes(value)) return "BREEDING";
  if (value === "trabajo") return "WORK";
  return null;
}
export function parseImportBirthDate(raw: string): Date | null {
  if (!raw.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const value = new Date(raw + "T00:00:00.000Z");
  if (!Number.isFinite(value.getTime()) || value.toISOString().slice(0, 10) !== raw ||
      value > new Date()) return null;
  return value;
}

/** Inspect ZIP central directory before an XLSX parser inflates XML. */
export function assertReasonableXlsxZip(bytes: Uint8Array) {
  if (bytes.length < 22) throw new Error("UNSAFE_PREVIEW_ARCHIVE");
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let p = bytes.length - 22; p >= Math.max(0, bytes.length - 65557); p--) {
    if (v.getUint32(p, true) === 0x06054b50 && p + 22 + v.getUint16(p + 20, true) === bytes.length) {
      eocd = p; break;
    }
  }
  if (eocd < 0) throw new Error("UNSAFE_PREVIEW_ARCHIVE");
  const entries = v.getUint16(eocd + 10, true);
  const size = v.getUint32(eocd + 12, true);
  let offset = v.getUint32(eocd + 16, true);
  if (entries === 0 || entries > MAX_ZIP_ENTRIES || size > bytes.length ||
      offset > bytes.length - size || offset + size > eocd) throw new Error("UNSAFE_PREVIEW_ARCHIVE");
  let expanded = 0;
  for (let i = 0; i < entries; i++) {
    if (offset + 46 > eocd || v.getUint32(offset, true) !== 0x02014b50) throw new Error("UNSAFE_PREVIEW_ARCHIVE");
    const compressed = v.getUint32(offset + 20, true);
    const uncompressed = v.getUint32(offset + 24, true);
    const flags = v.getUint16(offset + 8, true);
    const filename = v.getUint16(offset + 28, true);
    const extra = v.getUint16(offset + 30, true);
    const comment = v.getUint16(offset + 32, true);
    if ((flags & 1) !== 0 || uncompressed === 0xffffffff || compressed === 0xffffffff) throw new Error("UNSAFE_PREVIEW_ARCHIVE");
    expanded += uncompressed;
    if (expanded > MAX_INFLATED_BYTES || (compressed > 0 && uncompressed / compressed > 200)) {
      throw new Error("UNSAFE_PREVIEW_ARCHIVE");
    }
    offset += 46 + filename + extra + comment;
  }
  if (offset !== v.getUint32(eocd + 16, true) + size) throw new Error("UNSAFE_PREVIEW_ARCHIVE");
}

async function parseGrid(bytes: Uint8Array, filename: string): Promise<{ name: string; rows: unknown[][] }> {
  if (filename.toLowerCase().endsWith(".csv")) {
    if (bytes.some(b => b === 0)) throw new Error("INVALID_PREVIEW_WORKBOOK");
    try {
      const raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      const rows = parseCsv(raw, { bom: true, skip_empty_lines: true, relax_column_count: true,
        max_record_size: 16 * 1024 }) as unknown[][];
      return { name: "CSV", rows };
    } catch {
      throw new Error("INVALID_PREVIEW_WORKBOOK");
    }
  }
  assertReasonableXlsxZip(bytes);
  try {
    const rows = await readSheet(Buffer.from(bytes)) as unknown[][];
    return { name: "Primera hoja", rows };
  } catch {
    throw new Error("INVALID_PREVIEW_WORKBOOK");
  }
}

export async function previewLivestockWorkbook(
  bytes: Uint8Array, filename: string, overrides: MappingOverrides = {},
): Promise<LivestockPreview> {
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_PREVIEW_BYTES) throw new Error("INVALID_PREVIEW_FILE_SIZE");
  if (!/\.(csv|xlsx)$/i.test(filename)) throw new Error("UNSUPPORTED_PREVIEW_EXTENSION");
  const { name, rows: grid } = await parseGrid(bytes, filename);
  if (!grid.length) throw new Error("EMPTY_PREVIEW_WORKBOOK");
  const autoHeader = grid.findIndex(row => Array.isArray(row) && row.some(x => fieldForHeader(cellText(x)) === "internalCode"));
  const headerIndex = autoHeader >= 0 && autoHeader <= 4 ? autoHeader : grid.findIndex((row, i) => i <= 4 && Array.isArray(row) && row.filter(x => cellText(x)).length >= 2);
  if (headerIndex < 0) throw new Error("ANIMAL_CODE_HEADER_REQUIRED");
  const headers = grid[headerIndex].slice(0, 60).map(cellText);
  const positions: Partial<Record<Field, number>> = {};
  for (const [i, label] of headers.entries()) {
    const field = fieldForHeader(label);
    if (field && positions[field] === undefined) positions[field] = i;
  }
  for (const [field, rawIndex] of Object.entries(overrides)) {
    if (!(field in IMPORT_FIELDS)) throw new Error("INVALID_COLUMN_MAPPING");
    if (rawIndex === null) {
      delete positions[field as Field];
      continue;
    }
    if (!Number.isSafeInteger(rawIndex) || rawIndex < 0 || rawIndex >= headers.length || !headers[rawIndex]) {
      throw new Error("INVALID_COLUMN_MAPPING");
    }
    positions[field as Field] = rawIndex;
  }
  const used = Object.values(positions);
  if (new Set(used).size !== used.length) throw new Error("DUPLICATE_COLUMN_MAPPING");
  if (positions.internalCode === undefined) throw new Error("ANIMAL_CODE_HEADER_REQUIRED");
  const mapping: Partial<Record<Field, string>> = {};
  for (const field of Object.keys(positions) as Field[]) mapping[field] = headers[positions[field]!];
  const unknownHeaders = headers.filter((h, i) => h && !used.includes(i));
  const body = grid.slice(headerIndex + 1);
  const truncated = body.length > MAX_PREVIEW_ROWS;
  const seen = new Set<string>();
  const previewRows: PreviewRow[] = [], issues: PreviewIssue[] = [];
  const candidateCodes: LivestockPreview['candidateCodes'] = [];
  const importRows: LivestockPreview['importRows'] = [];
  let validRows = 0, rowCount = 0;
  for (const [index, row] of body.slice(0, MAX_PREVIEW_ROWS).entries()) {
    if (!Array.isArray(row) || row.every(x => !cellText(x))) continue;
    rowCount++;
    const sourceRow = headerIndex + index + 2;
    const code = getCell(row, positions.internalCode);
    const sex = getCell(row, positions.sex);
    const weight = getCell(row, positions.initialWeight);
    const rowIssues: PreviewIssue[] = [];
    if (!code) rowIssues.push({ row: sourceRow, field: "codigo", code: "REQUIRED_CODE" });
    else if (/^[=+@]/.test(code)) rowIssues.push({ row: sourceRow, field: "codigo", code: "UNSAFE_FORMULA" });
    const normalizedCode = norm(code);
    if (normalizedCode && seen.has(normalizedCode)) rowIssues.push({ row: sourceRow, field: "codigo", code: "DUPLICATE_CODE" });
    if (normalizedCode) seen.add(normalizedCode);
    if (sex && !["m", "f", "macho", "hembra", "masculino", "femenino"].includes(norm(sex)))
      rowIssues.push({ row: sourceRow, field: "sexo", code: "UNRECOGNIZED_SEX" });
    if (weight && !validWeight(weight)) rowIssues.push({ row: sourceRow, field: "peso", code: "INVALID_WEIGHT" });
    const lineValue = getCell(row, positions.productiveLine);
    if (normalizeImportProductiveLine(lineValue) === null)
      rowIssues.push({ row: sourceRow, field: "linea", code: "UNKNOWN_PRODUCTIVE_LINE" });
    const birthValue = getCell(row, positions.birthDate);
    if (birthValue && parseImportBirthDate(birthValue) === null)
      rowIssues.push({ row: sourceRow, field: "nacimiento", code: "INVALID_BIRTH_DATE" });
    const species = getCell(row, positions.species);
    if (!species) rowIssues.push({ row: sourceRow, field: "especie", code: "REQUIRED_SPECIES" });
    if (rowIssues.length === 0) validRows++;
    importRows.push({ row: sourceRow, code, species, breed: getCell(row, positions.breed), sex,
      weight, productiveLine: getCell(row, positions.productiveLine), birthDate: getCell(row, positions.birthDate),
      lot: getCell(row, positions.lot), valid: rowIssues.length === 0 });
    if (code) candidateCodes.push({ row: sourceRow, code, valid: rowIssues.length === 0 });
    issues.push(...rowIssues);
    if (previewRows.length < 20) previewRows.push({
      sourceRow, internalCode: code, species: getCell(row, positions.species), breed: getCell(row, positions.breed),
      sex, initialWeight: weight, productiveLine: getCell(row, positions.productiveLine),
      birthDate: getCell(row, positions.birthDate), lot: getCell(row, positions.lot), issues: rowIssues,
    });
  }
  const warnings = ["Solo vista previa; no se escriben registros ni se guardan archivos."];
  if (truncated) warnings.push("El archivo supera 500 filas; divide el inventario en lotes.");
  if (positions.species === undefined) warnings.push("Falta asignar la especie antes de cualquier importación definitiva.");
  if (unknownHeaders.length) warnings.push("Hay columnas sin asignación; puedes mapearlas manualmente.");
  return { status: "PREVIEW_ONLY", sheetName: name, headers, mapping, mappingPositions: positions,
    unknownHeaders, rowCount, validRows, issueCount: issues.length, issues: issues.slice(0, 100),
    previewRows, truncated, warnings, candidateCodes, importRows };
}
