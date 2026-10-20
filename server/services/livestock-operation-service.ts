import { applyOperationResultsAtomically } from "@/server/services/livestock-operation-apply-service";
import type {
  LivestockOperationSheetType,
  LivestockOperationStatus,
  OperationAnimalGeneralStatus,
} from "@prisma/client";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as XLSX from "xlsx";

import { normalizeAnimalCode } from "@/lib/utils";
import { validateOperationImportRows } from "@/lib/operations/validate-import-rows";
import { prisma } from "@/lib/db/prisma";
import type {
  LivestockOperationInput,
  OperationAnimalResultInput,
  OperationExpenseInput,
  OperationWorkerInput,
} from "@/lib/validators/livestock-operation";
import { findFarmById } from "@/server/repositories/farm-repository";
import {
  createAnimalEvent,
  createAnimalTreatmentRecord,
  createAnimalVaccinationRecord,
  createAnimalWeightRecord,
  listAnimalsByTenant,
  updateAnimal,
} from "@/server/repositories/livestock-repository";
import {
  countOperationSheets,
  createLivestockOperation,
  createOperationAnimals,
  createOperationExpense,
  createOperationSheet,
  createOperationWorker,
  findLivestockOperationById,
  findOperationAnimalById,
  listOperationAnimals,
  updateLivestockOperation,
  updateOperationAnimal,
} from "@/server/repositories/livestock-operation-repository";
import { storeFile } from "@/server/services/file-storage-service";

function normalizeDecimal(value?: string) {
  if (!value?.trim()) {
    return null;
  }

  return value.replace(",", ".");
}

function healthStatusFromGeneralStatus(
  status: OperationAnimalGeneralStatus,
): "HEALTHY" | "UNDER_OBSERVATION" | "SICK" {
  switch (status) {
    case "GOOD":
      return "HEALTHY";
    case "UNDER_OBSERVATION":
      return "UNDER_OBSERVATION";
    case "SICK":
    case "CRITICAL":
      return "SICK";
    default:
      return "HEALTHY";
  }
}

async function resolveOperationAnimals(
  tenantId: string,
  farmId: string,
  input: LivestockOperationInput,
) {
  const animals = await listAnimalsByTenant(tenantId);
  const farmAnimals = animals.filter((animal) => animal.farmId === farmId);

  if (input.includeAllFarmAnimals) {
    return farmAnimals;
  }

  const selected = farmAnimals.filter((animal) => input.animalIds.includes(animal.id));

  if (selected.length === 0) {
    throw new Error("NO_OPERATION_ANIMALS");
  }

  return selected;
}

function buildSheetRows(
  operation: Awaited<ReturnType<typeof findLivestockOperationById>>,
) {
  if (!operation) {
    return [];
  }

  return operation.animals.map((row) => [
    row.internalCodeSnapshot,
    row.visualIdentificationSnapshot ?? "",
    row.animal.species.name,
    row.animal.breed?.name ?? "",
    row.lotOrZoneSnapshot ?? "",
    row.animal.currentWeightKg?.toString() ?? "",
    "",
    "",
    "",
    "",
    "",
    "",
  ]);
}

async function storeGeneratedSheet(params: {
  tenantId: string;
  operationId: string;
  actorUserId: string;
  label: string;
  type: LivestockOperationSheetType;
  fileName: string;
  contentType: string;
  bytes: Uint8Array;
}) {
  const version = (await countOperationSheets(params.operationId, params.type)) + 1;
  const file = new File([Buffer.from(params.bytes)], params.fileName, {
    type: params.contentType,
  });
  const storedFile = await storeFile({
    tenantId: params.tenantId,
    uploadedById: params.actorUserId,
    file,
    usage: "operation_sheet",
    entityType: "livestock_operation",
    entityId: params.operationId,
    label: params.label,
  });

  await createOperationSheet({
    tenantId: params.tenantId,
    operationId: params.operationId,
    fileId: storedFile.id,
    generatedById: params.actorUserId,
    type: params.type,
    source: "GENERATED",
    label: params.label,
    version,
    blobUrl: storedFile.url,
    blobPath: storedFile.path,
    contentType: storedFile.mimeType,
    size: storedFile.size,
  });

  // Generating a copy does not rewind an already captured operation.
  await prisma.livestockOperation.updateMany({
    where: { id: params.operationId, tenantId: params.tenantId, status: "DRAFT" },
    data: { status: "SHEETS_READY" },
  });

  return storedFile;
}

async function buildOperationPdfBytes(
  operation: NonNullable<Awaited<ReturnType<typeof findLivestockOperationById>>>,
) {
  const document = await PDFDocument.create();
  let page = document.addPage([842, 595]);
  const font = await document.embedFont(StandardFonts.Helvetica);
  const boldFont = await document.embedFont(StandardFonts.HelveticaBold);
  const { height } = page.getSize();
  const rows = buildSheetRows(operation);

  page.drawText("GanadIA - Planilla interna de control ganadero", {
    x: 40,
    y: height - 40,
    size: 18,
    font: boldFont,
    color: rgb(0.12, 0.16, 0.2),
  });

  page.drawText(`Jornada: ${operation.title}`, {
    x: 40,
    y: height - 70,
    size: 11,
    font,
  });
  page.drawText(`Finca: ${operation.farm.name}`, {
    x: 40,
    y: height - 88,
    size: 11,
    font,
  });
  page.drawText(
    `Fecha: ${operation.operationDate.toISOString().slice(0, 10)} | Tipos: ${operation.plannedTypes.join(", ")}`,
    {
      x: 40,
      y: height - 106,
      size: 11,
      font,
    },
  );

  const headers = [
    "Codigo",
    "Visual",
    "Especie",
    "Raza",
    "Zona",
    "Peso actual",
    "Peso nuevo",
    "Vacuna",
    "Desparasitacion",
    "Tratamiento",
    "Estado",
    "Observaciones",
  ];
  const columnWidths = [70, 70, 55, 60, 60, 60, 60, 70, 70, 70, 55, 85];
  const tableTop = height - 145;
  const rowsPerPage = 16;
  const pages = Math.max(1, Math.ceil(rows.length / rowsPerPage));
  for (let pageIndex = 0; pageIndex < pages; pageIndex++) {
    if (pageIndex > 0) page = document.addPage([842, 595]);
    let x = 40;
    const top = pageIndex === 0 ? tableTop : height - 70;
    if (pageIndex > 0) {
      page.drawText("GanadIA - Planilla interna de control ganadero", { x: 40, y: height - 38, size: 14, font: boldFont });
    }
    headers.forEach((header, index) => {
      page.drawRectangle({ x, y: top, width: columnWidths[index], height: 20,
        color: rgb(0.93, 0.95, 0.97), borderColor: rgb(0.8, 0.83, 0.86), borderWidth: 1 });
      page.drawText(header, { x: x + 3, y: top + 6, size: 7, font: boldFont });
      x += columnWidths[index];
    });
    rows.slice(pageIndex * rowsPerPage, (pageIndex + 1) * rowsPerPage).forEach((row, index) => {
      let rowX = 40;
      const rowY = top - (index + 1) * 22;
      row.forEach((cell, column) => {
        page.drawRectangle({ x: rowX, y: rowY, width: columnWidths[column], height: 22,
          borderColor: rgb(0.86, 0.88, 0.9), borderWidth: 1 });
        page.drawText(String(cell).slice(0, 18).replace(/[^\\x20-\\x7E]/g, "?"),
          { x: rowX + 3, y: rowY + 7, size: 7, font });
        rowX += columnWidths[column];
      });
    });
    page.drawText(`Planilla interna · pagina ${pageIndex + 1} de ${pages} · ${rows.length} animales`, {
      x: 40, y: 34, size: 9, font, color: rgb(0.35, 0.39, 0.44),
    });
  }

  return document.save();
}

async function buildOperationWorkbookBytes(
  operation: NonNullable<Awaited<ReturnType<typeof findLivestockOperationById>>>,
) {
  const workbook = XLSX.utils.book_new();
  const infoSheet = XLSX.utils.aoa_to_sheet([
    ["GanadIA - Plantilla interna de control ganadero"],
    ["Jornada", operation.title],
    ["Finca", operation.farm.name],
    ["Fecha", operation.operationDate.toISOString().slice(0, 10)],
    ["Tipos", operation.plannedTypes.join(", ")],
    ["Regla", "No editar encabezados de la hoja Planilla"],
  ]);

  const planillaRows = [
    [
      "Codigo interno",
      "Identificacion visual",
      "Especie",
      "Raza",
      "Zona",
      "Peso actual",
      "Peso nuevo",
      "Vacuna aplicada",
      "Desparasitacion",
      "Tratamiento",
      "Estado general",
      "Observaciones",
    ],
    ...buildSheetRows(operation),
  ];
  const planillaSheet = XLSX.utils.aoa_to_sheet(planillaRows);

  XLSX.utils.book_append_sheet(workbook, infoSheet, "Operacion");
  XLSX.utils.book_append_sheet(workbook, planillaSheet, "Planilla");

  return XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  }) as Uint8Array;
}

export async function createLivestockOperationForTenant(
  tenantId: string,
  actorUserId: string,
  input: LivestockOperationInput,
) {
  const farm = await findFarmById(input.farmId);

  if (!farm || farm.tenantId !== tenantId) {
    throw new Error("FARM_NOT_FOUND");
  }

  const animals = await resolveOperationAnimals(tenantId, input.farmId, input);
  const operation = await createLivestockOperation({
    tenantId,
    farmId: input.farmId,
    createdById: actorUserId,
    title: input.title,
    operationDate: new Date(input.operationDate),
    plannedTypes: input.plannedTypes,
    includeAllFarmAnimals: input.includeAllFarmAnimals,
    notes: input.notes?.trim() || null,
  });

  await createOperationAnimals(
    animals.map((animal) => ({
      tenantId,
      operationId: operation.id,
      animalId: animal.id,
      internalCodeSnapshot: animal.internalCode,
      visualIdentificationSnapshot: animal.visualIdentification,
      lotOrZoneSnapshot: animal.lotOrZone,
    })),
  );

  return operation;
}

export async function generateOperationPdfForTenant(
  tenantId: string,
  actorUserId: string,
  operationId: string,
) {
  const operation = await findLivestockOperationById(operationId);

  if (!operation || operation.tenantId !== tenantId) {
    throw new Error("OPERATION_NOT_FOUND");
  }

  const bytes = await buildOperationPdfBytes(operation);

  return storeGeneratedSheet({
    tenantId,
    operationId,
    actorUserId,
    label: `Planilla PDF - ${operation.title}`,
    type: "PDF",
    fileName: `${operation.title.toLowerCase().replace(/\s+/g, "-")}-planilla.pdf`,
    contentType: "application/pdf",
    bytes,
  });
}

export async function generateOperationExcelForTenant(
  tenantId: string,
  actorUserId: string,
  operationId: string,
) {
  const operation = await findLivestockOperationById(operationId);

  if (!operation || operation.tenantId !== tenantId) {
    throw new Error("OPERATION_NOT_FOUND");
  }

  const bytes = await buildOperationWorkbookBytes(operation);

  return storeGeneratedSheet({
    tenantId,
    operationId,
    actorUserId,
    label: `Plantilla Excel - ${operation.title}`,
    type: "EXCEL",
    fileName: `${operation.title.toLowerCase().replace(/\s+/g, "-")}-planilla.xlsx`,
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    bytes,
  });
}

export async function importOperationExcelForTenant(
  tenantId: string,
  actorUserId: string,
  operationId: string,
  file: File,
) {
  const operation = await findLivestockOperationById(operationId);
  if (!operation || operation.tenantId !== tenantId) throw new Error("OPERATION_NOT_FOUND");
  if (!["DRAFT", "SHEETS_READY", "RESULTS_CAPTURED"].includes(operation.status)) {
    throw new Error("OPERATION_CLOSED");
  }
  if (!file.name.toLowerCase().endsWith(".xlsx") || file.size <= 0 || file.size > 10 * 1024 * 1024) {
    throw new Error("INVALID_OPERATION_WORKBOOK");
  }

  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const sheet = workbook.Sheets.Planilla;
  if (!sheet) throw new Error("MISSING_OPERATION_SHEET");
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  const operationAnimals = await listOperationAnimals(operationId);
  const planned = validateOperationImportRows(rows, operationAnimals);

  // Nothing is written unless all rows, identities and data are valid.
  await prisma.$transaction(async (tx) => {
    const active = await tx.livestockOperation.findFirst({
      where: { id: operationId, tenantId, status: { in: ["DRAFT", "SHEETS_READY", "RESULTS_CAPTURED"] } },
      select: { id: true },
    });
    if (!active) throw new Error("OPERATION_CLOSED");
    const current = await tx.livestockOperationAnimal.findMany({
      where: { tenantId, operationId }, select: { id: true, appliedToAnimalHistory: true },
    });
    const map = new Map(current.map(row => [row.id, row]));
    for (const item of planned) {
      const row = map.get(item.operationAnimalId);
      if (!row || row.appliedToAnimalHistory) throw new Error("OPERATION_ALREADY_APPLIED");
      await tx.livestockOperationAnimal.update({
        where: { id: item.operationAnimalId },
        data: { weightKg: item.weightKg, vaccineName: item.vaccineName,
          dewormingName: item.dewormingName, treatmentName: item.treatmentName,
          observations: item.observations, generalStatus: item.generalStatus,
          status: "CAPTURED", capturedAt: new Date() },
      });
    }
    await tx.livestockOperation.update({
      where: { id: operationId },
      data: { status: "RESULTS_CAPTURED" },
    });
  });

  // The source workbook is supplementary; failures storing it must not rewind confirmed results.
  try {
    const stored = await storeFile({
      tenantId, uploadedById: actorUserId, file, usage: "import_file",
      entityType: "livestock_operation", entityId: operationId,
      label: `Resultados importados - ${operation.title}`,
    });
    const version = (await countOperationSheets(operationId, "RESULTS_UPLOAD")) + 1;
    await createOperationSheet({
      tenantId, operationId, fileId: stored.id, generatedById: actorUserId,
      type: "RESULTS_UPLOAD", source: "IMPORTED",
      label: `Resultados Excel importados - ${operation.title}`,
      version, blobUrl: stored.url, blobPath: stored.path,
      contentType: stored.mimeType, size: stored.size,
    });
  } catch (error) {
    console.error("OPERATION_UPLOAD_ARCHIVE_FAILED", error);
  }
}

export async function saveOperationAnimalResultForTenant(
  tenantId: string,
  input: OperationAnimalResultInput,
) {
  const operationAnimal = await findOperationAnimalById(input.operationAnimalId);

  if (!operationAnimal || operationAnimal.tenantId !== tenantId) {
    throw new Error("OPERATION_ANIMAL_NOT_FOUND");
  }
  if (operationAnimal.appliedToAnimalHistory || ["APPLIED", "CANCELLED"].includes(operationAnimal.operation.status)) {
    throw new Error("OPERATION_ALREADY_APPLIED");
  }

  const operationAnimalRecord = await updateOperationAnimal(input.operationAnimalId, {
    weightKg: normalizeDecimal(input.weightKg),
    vaccineName: input.vaccineName?.trim() || null,
    dewormingName: input.dewormingName?.trim() || null,
    treatmentName: input.treatmentName?.trim() || null,
    observations: input.observations?.trim() || null,
    generalStatus: input.generalStatus,
    status: input.skipped ? "SKIPPED" : "CAPTURED",
    capturedAt: new Date(),
  });

  await updateLivestockOperation(operationAnimal.operationId, {
    status: "RESULTS_CAPTURED",
  });

  return operationAnimalRecord;
}

export async function addOperationExpenseForTenant(
  tenantId: string,
  input: OperationExpenseInput,
) {
  const operation = await findLivestockOperationById(input.operationId);

  if (!operation || operation.tenantId !== tenantId) {
    throw new Error("OPERATION_NOT_FOUND");
  }

  return createOperationExpense({
    tenantId,
    operationId: input.operationId,
    label: input.label,
    amount: normalizeDecimal(input.amount)!,
    notes: input.notes?.trim() || null,
  });
}

export async function addOperationWorkerForTenant(
  tenantId: string,
  input: OperationWorkerInput,
) {
  const operation = await findLivestockOperationById(input.operationId);

  if (!operation || operation.tenantId !== tenantId) {
    throw new Error("OPERATION_NOT_FOUND");
  }

  return createOperationWorker({
    tenantId,
    operationId: input.operationId,
    employeeId: input.employeeId?.trim() || null,
    fullName: input.fullName,
    role: input.role,
    notes: input.notes?.trim() || null,
  });
}

export async function applyOperationResultsForTenant(
  tenantId: string,
  actorUserId: string,
  operationId: string,
) {
  return applyOperationResultsAtomically(tenantId, actorUserId, operationId);
}
