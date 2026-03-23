import type {
  LivestockOperationSheetType,
  LivestockOperationStatus,
  OperationAnimalGeneralStatus,
} from "@prisma/client";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as XLSX from "xlsx";

import { normalizeAnimalCode } from "@/lib/utils";
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

  await updateLivestockOperation(params.operationId, {
    status: "SHEETS_READY",
  });

  return storedFile;
}

async function buildOperationPdfBytes(
  operation: NonNullable<Awaited<ReturnType<typeof findLivestockOperationById>>>,
) {
  const document = await PDFDocument.create();
  const page = document.addPage([842, 595]);
  const font = await document.embedFont(StandardFonts.Helvetica);
  const boldFont = await document.embedFont(StandardFonts.HelveticaBold);
  const { height } = page.getSize();
  const rows = buildSheetRows(operation);

  page.drawText("AgroLynk - Planilla Oficial de Control Ganadero", {
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
  let currentX = 40;
  const tableTop = height - 145;

  headers.forEach((header, index) => {
    page.drawRectangle({
      x: currentX,
      y: tableTop,
      width: columnWidths[index],
      height: 20,
      color: rgb(0.93, 0.95, 0.97),
      borderColor: rgb(0.8, 0.83, 0.86),
      borderWidth: 1,
    });
    page.drawText(header, {
      x: currentX + 3,
      y: tableTop + 6,
      size: 8,
      font: boldFont,
    });
    currentX += columnWidths[index];
  });

  rows.slice(0, 15).forEach((row, rowIndex) => {
    let rowX = 40;
    const rowY = tableTop - (rowIndex + 1) * 22;

    row.forEach((cell, cellIndex) => {
      page.drawRectangle({
        x: rowX,
        y: rowY,
        width: columnWidths[cellIndex],
        height: 22,
        borderColor: rgb(0.86, 0.88, 0.9),
        borderWidth: 1,
      });
      page.drawText(String(cell).slice(0, 18), {
        x: rowX + 3,
        y: rowY + 7,
        size: 7,
        font,
      });
      rowX += columnWidths[cellIndex];
    });
  });

  page.drawText(
    "Flujo oficial: imprimir o llenar offline, luego cargar resultados al sistema para aplicar historial.",
    {
      x: 40,
      y: 35,
      size: 9,
      font,
      color: rgb(0.35, 0.39, 0.44),
    },
  );

  return document.save();
}

async function buildOperationWorkbookBytes(
  operation: NonNullable<Awaited<ReturnType<typeof findLivestockOperationById>>>,
) {
  const workbook = XLSX.utils.book_new();
  const infoSheet = XLSX.utils.aoa_to_sheet([
    ["AgroLynk - Plantilla Oficial de Control Ganadero"],
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

  if (!operation || operation.tenantId !== tenantId) {
    throw new Error("OPERATION_NOT_FOUND");
  }

  const storedFile = await storeFile({
    tenantId,
    uploadedById: actorUserId,
    file,
    usage: "import_file",
    entityType: "livestock_operation",
    entityId: operationId,
    label: `Resultados importados - ${operation.title}`,
  });

  const workbook = XLSX.read(await file.arrayBuffer(), {
    type: "array",
  });
  const sheet =
    workbook.Sheets.Planilla ?? workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
    defval: "",
  });
  const operationAnimals = await listOperationAnimals(operationId);

  for (const row of rows) {
    const code = normalizeAnimalCode(
      String(
        row["Codigo interno"] ||
          row["Codigo"] ||
          row["codigo interno"] ||
          row["codigo"],
      ),
    );

    if (!code) {
      continue;
    }

    const match = operationAnimals.find((item) => {
      const codes = [
        item.internalCodeSnapshot,
        item.visualIdentificationSnapshot ?? "",
        item.animal.internalCode,
        item.animal.visualIdentification ?? "",
      ].map(normalizeAnimalCode);

      return codes.includes(code);
    });

    if (!match) {
      continue;
    }

    await updateOperationAnimal(match.id, {
      weightKg: normalizeDecimal(String(row["Peso nuevo"] || row["Peso"] || "")),
      vaccineName: String(row["Vacuna aplicada"] || row["Vacuna"] || "").trim() || null,
      dewormingName:
        String(row["Desparasitacion"] || row["Desparasitante"] || "").trim() || null,
      treatmentName:
        String(row["Tratamiento"] || row["Tratamiento aplicado"] || "").trim() || null,
      observations:
        String(row["Observaciones"] || row["Observacion"] || "").trim() || null,
      generalStatus:
        (String(row["Estado general"] || "NOT_CHECKED").trim().toUpperCase() as OperationAnimalGeneralStatus) ||
        "NOT_CHECKED",
      status: "CAPTURED",
      capturedAt: new Date(),
    });
  }

  const version = (await countOperationSheets(operationId, "RESULTS_UPLOAD")) + 1;

  await createOperationSheet({
    tenantId,
    operationId,
    fileId: storedFile.id,
    generatedById: actorUserId,
    type: "RESULTS_UPLOAD",
    source: "IMPORTED",
    label: `Resultados Excel importados - ${operation.title}`,
    version,
    blobUrl: storedFile.url,
    blobPath: storedFile.path,
    contentType: storedFile.mimeType,
    size: storedFile.size,
  });

  await updateLivestockOperation(operationId, {
    status: "RESULTS_CAPTURED",
  });
}

export async function saveOperationAnimalResultForTenant(
  tenantId: string,
  input: OperationAnimalResultInput,
) {
  const operationAnimal = await findOperationAnimalById(input.operationAnimalId);

  if (!operationAnimal || operationAnimal.tenantId !== tenantId) {
    throw new Error("OPERATION_ANIMAL_NOT_FOUND");
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
  const operation = await findLivestockOperationById(operationId);

  if (!operation || operation.tenantId !== tenantId) {
    throw new Error("OPERATION_NOT_FOUND");
  }

  for (const row of operation.animals) {
    if (row.appliedToAnimalHistory || row.status === "SKIPPED") {
      continue;
    }

    const shouldApply =
      Boolean(row.weightKg) ||
      Boolean(row.vaccineName) ||
      Boolean(row.dewormingName) ||
      Boolean(row.treatmentName) ||
      Boolean(row.observations) ||
      row.generalStatus !== "NOT_CHECKED";

    if (!shouldApply) {
      continue;
    }

    if (row.weightKg) {
      await createAnimalWeightRecord({
        tenantId,
        animalId: row.animalId,
        recordedById: actorUserId,
        weightKg: row.weightKg.toString(),
        recordedAt: operation.operationDate,
        note: `Jornada ${operation.title}`,
      });

      await updateAnimal(row.animalId, {
        currentWeightKg: row.weightKg.toString(),
      });
    }

    if (row.vaccineName) {
      await createAnimalVaccinationRecord({
        tenantId,
        animalId: row.animalId,
        recordedById: actorUserId,
        vaccineName: row.vaccineName,
        appliedAt: operation.operationDate,
        note: `Jornada ${operation.title}`,
      });
    }

    if (row.dewormingName) {
      await createAnimalTreatmentRecord({
        tenantId,
        animalId: row.animalId,
        recordedById: actorUserId,
        treatmentName: row.dewormingName,
        appliedAt: operation.operationDate,
        diagnosis: "Desparasitacion",
        note: `Jornada ${operation.title}`,
      });
    }

    if (row.treatmentName) {
      await createAnimalTreatmentRecord({
        tenantId,
        animalId: row.animalId,
        recordedById: actorUserId,
        treatmentName: row.treatmentName,
        appliedAt: operation.operationDate,
        note: `Jornada ${operation.title}`,
      });
    }

    if (row.generalStatus !== "NOT_CHECKED") {
      await updateAnimal(row.animalId, {
        healthStatus: healthStatusFromGeneralStatus(row.generalStatus),
      });
    }

    await createAnimalEvent({
      tenantId,
      animalId: row.animalId,
      actorUserId,
      eventType: "NOTE",
      title: `Jornada ${operation.title}`,
      description:
        row.observations?.trim() ||
        `Estado general: ${row.generalStatus.replaceAll("_", " ")}`,
      eventDate: operation.operationDate,
      metadata: {
        operationId: operation.id,
        operationTitle: operation.title,
      },
    });

    await updateOperationAnimal(row.id, {
      appliedToAnimalHistory: true,
      appliedAt: new Date(),
      status: "APPLIED",
    });
  }

  return updateLivestockOperation(operationId, {
    status: "APPLIED" as LivestockOperationStatus,
    resultsAppliedAt: new Date(),
  });
}
