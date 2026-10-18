import * as XLSX from "xlsx";

/**
 * Read-only onboarding preview. This module never calls Prisma, stores files,
 * updates livestock or invokes paid AI providers.
 */
export const MAX_PREVIEW_BYTES = 2 * 1024 * 1024;
export const MAX_PREVIEW_ROWS = 500;

const FIELD_ALIASES = {
  internalCode: ["codigo", "codigo animal", "codigo interno", "id animal", "identificador", "numero", "nro", "arete", "caravana"],
  species: ["especie", "tipo animal", "tipo de animal"],
  breed: ["raza"],
  sex: ["sexo", "genero"],
  initialWeight: ["peso", "peso kg", "peso inicial", "peso actual", "peso en kg"],
  productiveLine: ["linea", "linea productiva", "proposito", "actividad"],
  birthDate: ["nacimiento", "fecha de nacimiento", "fecha nacimiento"],
  lot: ["lote", "potrero", "grupo", "zona"],
  visualId: ["identificacion", "identificacion visual", "numero de arete"],
} as const;

type Field = keyof typeof FIELD_ALIASES;
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
  unknownHeaders: string[];
  rowCount: number;
  validRows: number;
  issueCount: number;
  issues: PreviewIssue[];
  previewRows: PreviewRow[];
  truncated: boolean;
  warnings: string[];
};

function normalize(value: unknown) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ");
}
function safeText(value: unknown) {
  return String(value ?? "").trim().slice(0, 256);
}
function getCell(row: unknown[], position: number | undefined) {
  return position === undefined ? "" : safeText(row[position]);
}
function findField(header: string): Field | undefined {
  const normalized = normalize(header);
  for (const field of Object.keys(FIELD_ALIASES) as Field[]) {
    if ((FIELD_ALIASES[field] as readonly string[]).includes(normalized)) return field;
  }
  return undefined;
}
function safeNumber(value: string) {
  const normalized = value.replace(/\s/g, "").replace(",", ".");
  const numeric = Number(normalized);
  return normalized !== "" && Number.isFinite(numeric) && numeric > 0 && numeric <= 5000;
}

export function previewLivestockWorkbook(bytes: Uint8Array, filename: string): LivestockPreview {
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_PREVIEW_BYTES) {
    throw new Error("INVALID_PREVIEW_FILE_SIZE");
  }
  if (!/\.(xlsx|csv)$/i.test(filename) || /\.(xlsm|xlsb|xls)$/i.test(filename)) {
    throw new Error("UNSUPPORTED_PREVIEW_EXTENSION");
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(bytes, {
      type: "array",
      bookVBA: false,
      cellFormula: false,
      cellStyles: false,
      cellHTML: false,
      dense: true,
      sheetRows: MAX_PREVIEW_ROWS + 3,
    });
  } catch {
    throw new Error("INVALID_PREVIEW_WORKBOOK");
  }
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("EMPTY_PREVIEW_WORKBOOK");
  const sheet = workbook.Sheets[sheetName];
  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  });
  if (grid.length === 0) throw new Error("EMPTY_PREVIEW_WORKBOOK");

  const headerIndex = grid.findIndex((row) =>
    Array.isArray(row) && row.some((cell) => findField(safeText(cell)) === "internalCode"),
  );
  if (headerIndex < 0 || headerIndex > 4) throw new Error("ANIMAL_CODE_HEADER_REQUIRED");
  const headerCells = grid[headerIndex].slice(0, 60);
  const headers = headerCells.map(safeText);
  const fieldPositions = {} as Partial<Record<Field, number>>;
  const mapping: Partial<Record<Field, string>> = {};
  const unknownHeaders: string[] = [];
  for (const [index, label] of headers.entries()) {
    if (!label) continue;
    const field = findField(label);
    if (field && fieldPositions[field] === undefined) {
      fieldPositions[field] = index;
      mapping[field] = label;
    } else {
      unknownHeaders.push(label);
    }
  }

  const body = grid.slice(headerIndex + 1);
  const truncated = body.length > MAX_PREVIEW_ROWS;
  const seen = new Set<string>();
  const previewRows: PreviewRow[] = [];
  const issues: PreviewIssue[] = [];
  let validRows = 0;
  let rowCount = 0;
  const warnings = ["Vista previa sin escritura en base de datos. Valide los datos antes de importar."];

  for (const [index, rawRow] of body.slice(0, MAX_PREVIEW_ROWS).entries()) {
    if (!Array.isArray(rawRow) || rawRow.every((cell) => safeText(cell) === "")) continue;
    rowCount++;
    const sourceRow = headerIndex + index + 2;
    const code = getCell(rawRow, fieldPositions.internalCode);
    const sex = getCell(rawRow, fieldPositions.sex);
    const weight = getCell(rawRow, fieldPositions.initialWeight);
    const rowIssues: PreviewIssue[] = [];
    if (!code) rowIssues.push({ row: sourceRow, field: "codigo", code: "REQUIRED_CODE" });
    else if (code.startsWith("=")) rowIssues.push({ row: sourceRow, field: "codigo", code: "UNSAFE_FORMULA" });
    const normalizedCode = normalize(code);
    if (normalizedCode && seen.has(normalizedCode)) rowIssues.push({ row: sourceRow, field: "codigo", code: "DUPLICATE_CODE" });
    if (normalizedCode) seen.add(normalizedCode);
    if (sex && !["m", "f", "macho", "hembra", "masculino", "femenino"].includes(normalize(sex))) {
      rowIssues.push({ row: sourceRow, field: "sexo", code: "UNRECOGNIZED_SEX" });
    }
    if (weight && !safeNumber(weight)) rowIssues.push({ row: sourceRow, field: "peso", code: "INVALID_WEIGHT" });
    if (rowIssues.length === 0) validRows++;
    issues.push(...rowIssues);
    if (previewRows.length < 20) {
      previewRows.push({
        sourceRow,
        internalCode: code,
        species: getCell(rawRow, fieldPositions.species),
        breed: getCell(rawRow, fieldPositions.breed),
        sex,
        initialWeight: weight,
        productiveLine: getCell(rawRow, fieldPositions.productiveLine),
        birthDate: getCell(rawRow, fieldPositions.birthDate),
        lot: getCell(rawRow, fieldPositions.lot),
        issues: rowIssues,
      });
    }
  }
  if (truncated) warnings.push("El archivo contiene más de 500 filas; divídalo en lotes menores.");
  if (!mapping.species) warnings.push("Falta la columna especie: debe resolverse antes de guardar animales.");
  if (unknownHeaders.length) warnings.push("Hay columnas sin asignación automática; requieren revisión manual.");
  return {
    status: "PREVIEW_ONLY",
    sheetName, headers, mapping, unknownHeaders,
    rowCount, validRows, issueCount: issues.length,
    issues: issues.slice(0, 100), previewRows, truncated, warnings,
  };
}
