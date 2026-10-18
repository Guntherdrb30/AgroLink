import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  previewLivestockWorkbook,
  normalizeImportProductiveLine,
  parseImportBirthDate,
  type MappingOverrides,
} from "@/lib/imports/livestock-preview";

function enumSex(raw: string): "MALE" | "FEMALE" | "UNKNOWN" {
  const sex = raw.trim().toLowerCase();
  if (["m", "macho", "masculino"].includes(sex)) return "MALE";
  if (["f", "hembra", "femenino"].includes(sex)) return "FEMALE";
  return "UNKNOWN";
}

/**
 * Executes exactly one tenant/farm-scoped transaction. Re-reads the original
 * workbook; never trusts preview JSON. A unique constraint and SERIALIZABLE
 * transaction protect concurrent requests from partial/duplicate imports.
 */
export async function commitLivestockImport(params: {
  tenantId: string;
  farmId: string;
  actorUserId: string;
  bytes: Uint8Array;
  filename: string;
  mapping: MappingOverrides;
}) {
  if (process.env.GANADIA_ENABLE_LIVESTOCK_IMPORT !== "true") {
    throw new Error("LIVESTOCK_IMPORT_DISABLED");
  }

  const preview = await previewLivestockWorkbook(params.bytes, params.filename, params.mapping);
  if (preview.truncated || preview.rowCount === 0 || preview.issueCount > 0 ||
      preview.validRows !== preview.rowCount || preview.importRows.length !== preview.rowCount) {
    throw new Error("IMPORT_HAS_VALIDATION_ERRORS");
  }

  const rows = preview.importRows.map(row => ({
    code: row.code.trim(),
    species: row.species.trim(),
    breed: row.breed.trim(),
    sex: enumSex(row.sex),
    visualId: row.visualId.trim() || null,
    weight: row.weight ? new Prisma.Decimal(row.weight.replace(",", ".")) : null,
    line: normalizeImportProductiveLine(row.productiveLine)!,
    birthDate: row.birthDate ? parseImportBirthDate(row.birthDate) : null,
    lot: row.lot.trim() || null,
  }));
  const codes = rows.map(row => row.code);

  try {
    return await prisma.$transaction(async tx => {
      const farm = await tx.farm.findFirst({
        where: { id: params.farmId, tenantId: params.tenantId },
        select: { id: true },
      });
      if (!farm) throw new Error("FARM_NOT_FOUND");

      // All animal codes are unique per tenant, including other farms.
      const existing = await tx.animal.findMany({
        where: { tenantId: params.tenantId, internalCode: { in: codes, mode: "insensitive" } },
        select: { id: true },
        take: 1,
      });
      if (existing.length) throw new Error("IMPORT_DUPLICATE_ANIMALS");

      const speciesIds = new Map<string, string>();
      const breedIds = new Map<string, string>();
      for (const row of rows) {
        const speciesKey = row.species.toLowerCase();
        let speciesId = speciesIds.get(speciesKey);
        if (!speciesId) {
          const species = await tx.species.upsert({
            where: { tenantId_name: { tenantId: params.tenantId, name: row.species } },
            update: {},
            create: { tenantId: params.tenantId, name: row.species },
          });
          speciesId = species.id;
          speciesIds.set(speciesKey, speciesId);
        }

        if (row.breed) {
          const breedKey = speciesId + ":" + row.breed.toLowerCase();
          if (!breedIds.has(breedKey)) {
            const breed = await tx.breed.upsert({
              where: { tenantId_speciesId_name: { tenantId: params.tenantId, speciesId, name: row.breed } },
              update: {},
              create: { tenantId: params.tenantId, speciesId, name: row.breed },
            });
            breedIds.set(breedKey, breed.id);
          }
        }
      }

      const animals: Prisma.AnimalCreateManyInput[] = rows.map(row => {
        const speciesId = speciesIds.get(row.species.toLowerCase())!;
        return {
          tenantId: params.tenantId,
          farmId: params.farmId,
          speciesId,
          breedId: row.breed ? breedIds.get(speciesId + ":" + row.breed.toLowerCase())! : null,
          internalCode: row.code,
          visualIdentification: row.visualId,
          sex: row.sex,
          productiveLine: row.line,
          birthDate: row.birthDate,
          initialWeightKg: row.weight,
          currentWeightKg: row.weight,
          lotOrZone: row.lot,
        };
      });

      // Bulk inserts keep a 500-animal import within a normal request duration.
      const created = await tx.animal.createMany({ data: animals });
      if (created.count !== rows.length) throw new Error("IMPORT_COUNT_MISMATCH");

      const inserted = await tx.animal.findMany({
        where: { tenantId: params.tenantId, farmId: params.farmId, internalCode: { in: codes } },
        select: { id: true, internalCode: true },
      });
      if (inserted.length !== rows.length) throw new Error("IMPORT_COUNT_MISMATCH");

      const byCode = new Map(inserted.map(animal => [animal.internalCode, animal.id]));
      const eventDate = new Date();
      await tx.animalEvent.createMany({
        data: rows.map(row => ({
          tenantId: params.tenantId,
          animalId: byCode.get(row.code)!,
          actorUserId: params.actorUserId,
          eventType: "ENTRY" as const,
          title: "Ingreso por importación de inventario",
          description: "Alta masiva validada en GanadIA.",
          eventDate,
        })),
      });

      const weighed = rows.filter(row => row.weight !== null);
      if (weighed.length) {
        await tx.animalWeightRecord.createMany({
          data: weighed.map(row => ({
            tenantId: params.tenantId,
            animalId: byCode.get(row.code)!,
            recordedById: params.actorUserId,
            weightKg: row.weight!,
            recordedAt: eventDate,
            note: "Peso inicial importado desde inventario.",
          })),
        });
      }
      await tx.auditLog.create({
        data: {
          tenantId: params.tenantId,
          actorUserId: params.actorUserId,
          entityType: "FARM",
          entityId: params.farmId,
          action: "LIVESTOCK_BATCH_IMPORTED",
          metadata: {
            quantity: rows.length,
            source: "CSV_XLSX",
            filename: params.filename.slice(0, 120),
          },
        },
      });
      return { imported: rows.length, farmId: params.farmId };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 45000,
      maxWait: 10000,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2002" || error.code === "P2034")) {
      throw new Error("IMPORT_DUPLICATE_OR_CONCURRENT");
    }
    throw error;
  }
}
