"use client";

import { useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

type FarmOption = { id: string; name: string };
type PreviewIssue = { row: number; field: string; code: string };
type PreviewRow = {
  sourceRow: number; internalCode: string; species: string; breed: string; sex: string;
  initialWeight: string; productiveLine: string; birthDate: string; lot: string;
  issues: PreviewIssue[];
};
type Result = {
  status: "PREVIEW_ONLY";
  farm: FarmOption;
  sheetName: string;
  rowCount: number;
  validRows: number;
  issueCount: number;
  issues: PreviewIssue[];
  previewRows: PreviewRow[];
  warnings: string[];
  unknownHeaders: string[];
  mapping: Record<string, string>;
  mappingPositions: Record<string, number>;
  headers: string[];
  truncated: boolean;
};

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const labels: Record<string, string> = {
  REQUIRED_CODE: "Falta el código del animal",
  DUPLICATE_CODE: "Código repetido en el archivo",
  UNSAFE_FORMULA: "Fórmula no permitida en el código",
  UNRECOGNIZED_SEX: "Sexo no reconocido",
  INVALID_WEIGHT: "El peso debe ser un número válido, mayor a cero",
  EXISTS_IN_FARM: "Animal ya registrado en esta finca",
};
const errors: Record<string, string> = {
  INVALID_PREVIEW_FILE_SIZE: "El archivo debe pesar como máximo 2 MB.",
  UNSUPPORTED_PREVIEW_EXTENSION: "Solo se admiten archivos CSV o XLSX sin macros.",
  UNSAFE_PREVIEW_ARCHIVE: "El Excel contiene una estructura no permitida o demasiado grande.",
  INVALID_COLUMN_MAPPING: "Una columna asignada no es válida.",
  DUPLICATE_COLUMN_MAPPING: "Una columna no puede asignarse a dos campos.",
  INVALID_PREVIEW_WORKBOOK: "No se pudo leer el archivo. Verifica que no esté dañado.",
  EMPTY_PREVIEW_WORKBOOK: "No se encontraron filas en el archivo.",
  ANIMAL_CODE_HEADER_REQUIRED: "No se reconoció una columna de código o identificación de animal.",
  FILE_TOO_LARGE: "Archivo demasiado grande.",
  PREVIEW_FAILED: "No se pudo procesar la vista previa. Revisa el archivo.",
};
function humanIssue(issue: PreviewIssue) {
  return labels[issue.code] ?? issue.code;
}

export function LivestockImportPreview({ farms }: { farms: FarmOption[] }) {
  const [farmId, setFarmId] = useState(farms[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<Result | null>(null);
  const [manualMap, setManualMap] = useState<Record<string, number>>({});

  function clearPreview() {
    setPreview(null);
    setError("");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearPreview();
    if (!farmId || !file) {
      setError("Selecciona una finca y un archivo para continuar.");
      return;
    }
    if (file.size === 0 || file.size > MAX_FILE_BYTES) {
      setError("El archivo debe tener contenido y no superar 2 MB.");
      return;
    }
    if (!/\.(xlsx|csv)$/i.test(file.name)) {
      setError("Solo se admiten archivos CSV y XLSX.");
      return;
    }
    const body = new FormData();
    body.append("farmId", farmId);
    body.append("file", file);
    if (Object.keys(manualMap).length) body.append("mapping", JSON.stringify(manualMap));
    setLoading(true);
    try {
      const response = await fetch("/api/imports/livestock/preview", {
        method: "POST",
        body,
        cache: "no-store",
        credentials: "same-origin",
      });
      const result = await response.json() as Result & { error?: string };
      if (!response.ok) {
        setError(errors[result.error ?? ""] ?? (response.status === 403 ? "No tienes permiso para importar." : "La vista previa no está disponible."));
        return;
      }
      if (result.status !== "PREVIEW_ONLY") throw new Error("UNEXPECTED_IMPORT_RESPONSE");
      setPreview(result);
    } catch {
      setError("No fue posible consultar el servidor. Inténtalo nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-7">
      <form id="ganadia-import-form" onSubmit={onSubmit} className="rounded-3xl border border-border bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-5 flex items-start gap-3">
          <FileSpreadsheet className="mt-1 size-6 text-primary" aria-hidden="true" />
          <div>
            <h2 className="text-xl font-semibold">Analizar inventario de ganado</h2>
            <p className="mt-1 text-sm text-muted-foreground">Selecciona una finca y revisa los datos antes de cualquier incorporación al sistema.</p>
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="import-farm" className="block text-sm font-medium">Finca</label>
            <select id="import-farm" name="farmId" required value={farmId}
              onChange={(event) => { setFarmId(event.target.value); clearPreview(); }}
              className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm">
              {farms.length === 0 ? <option value="">Primero registra una finca</option> : null}
              {farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="import-file" className="block text-sm font-medium">Archivo CSV o Excel (.xlsx)</label>
            <input id="import-file" name="file" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              required onChange={(event) => { setFile(event.target.files?.[0] ?? null); setManualMap({}); clearPreview(); }}
              className="block w-full cursor-pointer rounded-xl border border-border bg-white p-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium" />
            <p className="text-xs text-muted-foreground">Máximo 2 MB y 500 animales por revisión. Solo se analiza el archivo en memoria; no se guarda.</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={loading || !farmId || !file}>
            {loading ? <><Loader2 className="mr-2 size-4 animate-spin" />Analizando…</> : "Revisar archivo"}
          </Button>
          <a href="/templates/ganadia-inventario-ejemplo.csv" download
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-primary hover:bg-muted">
            <Download className="size-4" aria-hidden="true" />Descargar plantilla CSV
          </a>
        </div>
        {error ? <p role="alert" className="mt-5 flex items-start gap-2 rounded-xl border border-destructive/30 p-3 text-sm text-destructive"><AlertCircle className="size-4 shrink-0" />{error}</p> : null}
      </form>

      {preview ? (
        <section aria-live="polite" className="space-y-5">
          <div className="rounded-3xl border border-border bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Resultado de la revisión</h2>
                <p className="mt-1 text-sm text-muted-foreground">Finca: {preview.farm.name} · Hoja: {preview.sheetName}</p>
              </div>
              <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold">Solo vista previa</span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-muted p-4"><p className="text-2xl font-semibold">{preview.rowCount}</p><p className="text-sm text-muted-foreground">Filas examinadas</p></div>
              <div className="rounded-2xl bg-muted p-4"><p className="text-2xl font-semibold">{preview.validRows}</p><p className="text-sm text-muted-foreground">Filas sin errores detectados</p></div>
              <div className="rounded-2xl bg-muted p-4"><p className="text-2xl font-semibold">{preview.issueCount}</p><p className="text-sm text-muted-foreground">Observaciones</p></div>
            </div>
            <div className="mt-5 space-y-2">
              {preview.warnings.map((warning, index) =>
                <p key={index} className="text-sm text-muted-foreground"><AlertCircle className="mr-2 inline size-4" aria-hidden="true" />{warning}</p>
              )}
              {preview.issueCount === 0 ?
                <p className="flex items-center gap-2 text-sm font-medium"><CheckCircle2 className="size-4" />No se encontraron errores en las validaciones disponibles.</p> : null}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-white p-5">
            <h3 className="font-semibold">Asignar columnas del archivo</h3>
            <p className="mt-1 text-sm text-muted-foreground">Corrige las asignaciones automáticas. Pulsa “Revisar archivo” para validar nuevamente.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries({
                internalCode: "Código del animal", species: "Especie", breed: "Raza",
                sex: "Sexo", initialWeight: "Peso", productiveLine: "Línea productiva",
                birthDate: "Nacimiento", lot: "Lote", visualId: "Identificación visual",
              }).map(([key, label]) => (
                <label key={key} className="block text-sm">
                  <span className="mb-1 block font-medium">{label}</span>
                  <select value={manualMap[key] ?? preview.mappingPositions?.[key] ?? ""}
                    onChange={e => {
                      setManualMap(current => {
                        const next = { ...current };
                        if (e.target.value === "") delete next[key];
                        else next[key] = Number(e.target.value);
                        return next;
                      });
                    }}
                    className="h-10 w-full rounded-xl border border-border bg-white px-2">
                    <option value="">Sin asignar</option>
                    {preview.headers.map((header, index) => header ? <option value={index} key={index}>{header}</option> : null)}
                  </select>
                </label>
              ))}
            </div>
            <Button type="button" variant="outline" className="mt-4"
              disabled={loading} onClick={() => {
                const form = document.querySelector<HTMLFormElement>("#ganadia-import-form");
                form?.requestSubmit();
              }}>Aplicar mapeo y volver a analizar</Button>
          </div>
          <div className="overflow-hidden rounded-3xl border border-border bg-white">
            <div className="border-b border-border px-5 py-4">
              <h3 className="font-semibold">Vista previa de registros</h3>
              <p className="text-sm text-muted-foreground">Hasta 20 filas visibles. Los datos aún no se importan.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-muted text-muted-foreground">
                  <tr>{["Fila", "Código", "Especie", "Raza", "Sexo", "Peso (kg)", "Lote", "Revisión"].map(label => <th key={label} scope="col" className="px-4 py-3 font-medium">{label}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {preview.previewRows.map(row => (
                    <tr key={row.sourceRow}>
                      <td className="px-4 py-3">{row.sourceRow}</td>
                      <td className="px-4 py-3 font-medium">{row.internalCode || "—"}</td>
                      <td className="px-4 py-3">{row.species || "—"}</td>
                      <td className="px-4 py-3">{row.breed || "—"}</td>
                      <td className="px-4 py-3">{row.sex || "—"}</td>
                      <td className="px-4 py-3">{row.initialWeight || "—"}</td>
                      <td className="px-4 py-3">{row.lot || "—"}</td>
                      <td className="px-4 py-3">
                        {row.issues.length > 0 ? <span className="font-medium text-destructive">{row.issues.map(humanIssue).join("; ")}</span> : "Sin errores"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {preview.issues.length ? (
            <div className="rounded-3xl border border-border bg-white p-5">
              <h3 className="font-semibold">Observaciones para corregir</h3>
              <ul className="mt-3 max-h-60 space-y-2 overflow-y-auto text-sm">
                {preview.issues.map((issue, index) => <li key={index}>Fila {issue.row}: {humanIssue(issue)}.</li>)}
              </ul>
              {preview.issueCount > preview.issues.length ? <p className="mt-3 text-sm text-muted-foreground">Se muestran las primeras {preview.issues.length} observaciones.</p> : null}
            </div>
          ) : null}
          <div className="flex items-start gap-3 rounded-2xl border border-border p-4">
            <RotateCcw className="mt-1 size-5 shrink-0 text-primary" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Si encuentras errores, corrígelos en tu Excel o CSV y vuelve a seleccionar el archivo. Esta etapa no guarda ni modifica animales; la importación definitiva se habilitará después de probar duplicados contra la base de datos, mapeo y confirmación.</p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
