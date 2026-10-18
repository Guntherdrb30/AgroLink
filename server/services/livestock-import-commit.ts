import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { previewLivestockWorkbook, type MappingOverrides } from "@/lib/imports/livestock-preview";

function enumSex(raw: string): "MALE" | "FEMALE" | "UNKNOWN" {
  const sex = raw.trim().toLowerCase();
  if (["m", "macho", "masculino"].includes(sex)) return "MALE";
  if (["f", "hembra", "femenino"].includes(sex)) return "FEMALE";
  return "UNKNOWN";
}
function enumLine(raw: string): "BEEF" | "DAIRY" | "DUAL_PURPOSE" | "BREEDING" | "WORK" | "OTHER" {
  const line = raw.trim().toLowerCase();
  if (["ceba", "carne", "engorde"].includes(line)) return "BEEF";
  if (["leche", "lechero"].includes(line)) return "DAIRY";
  if (["doble proposito", "doble propósito"].includes(line)) return "DUAL_PURPOSE";
  if (["cria", "cría", "reproduccion", "reproducción"].includes(line)) return "BREEDING";
  if (["trabajo"].includes(line)) return "WORK";
  if (!line) return "OTHER";
  throw new Error("UNKNOWN_PRODUCTIVE_LINE");
}
function dateOrNull(raw: string): Date | null {
  if (!raw.trim()) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new Error("INVALID_BIRTH_DATE");
  const d = new Date(raw + "T00:00:00.000Z");
  if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== raw || d > new Date()) throw new Error("INVALID_BIRTH_DATE");
  return d;
}

/**
 * All-or-nothing, tenant-scoped write; disabled by default. The uploaded
 * file is parsed a second time on the server, never trusted from preview JSON.
 */
export async function commitLivestockImport(params: {
  tenantId: string; farmId: string; actorUserId: string;
  bytes: Uint8Array; filename: string; mapping: MappingOverrides;
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
    weight: row.weight ? new Prisma.Decimal(row.weight.replace(",", ".")) : null,
    line: enumLine(row.productiveLine),
    birthDate: dateOrNull(row.birthDate),
    lot: row.lot.trim(),
  }));
  const codes = rows.map(r => r.code);
  const result = await prisma.$transaction(async tx => {
    const farm = await tx.farm.findFirst({ where: { id: params.farmId, tenantId: params.tenantId }, select: { id: true } });
    if (!farm) throw new Error("FARM_NOT_FOUND");
    const existing = await tx.animal.findMany({
      where: { tenantId: params.tenantId, internalCode: { in: codes } }, select: { internalCode: true },
    });
    if (existing.length) throw new Error("IMPORT_DUPLICATE_ANIMALS");
    const speciesIds = new Map<string, string>(), breedIds = new Map<string, string>();
    for (const row of rows) {
      let speciesId = speciesIds.get(row.species);
      if (!speciesId) {
        const species = await tx.species.upsert({
          where: { tenantId_name: { tenantId: params.tenantId, name: row.species } },
          update: {}, create: { tenantId: params.tenantId, name: row.species },
        });
        speciesId = species.id;
        speciesIds.set(row.species, speciesId);
      }
      let breedId: string | null = null;
      if (row.breed) {
        const key = speciesId + ":" + row.breed;
        const found = breedIds.get(key);
        if (found) breedId = found;
        else {
          const breed = await tx.breed.upsert({
            where: { tenantId_speciesId_name: { tenantId: params.tenantId, speciesId, name: row.breed } },
            update: {}, create: { tenantId: params.tenantId, speciesId, name: row.breed },
          });
          breedId = breed.id;
          breedIds.set(key, breedId);
        }
      }
      const animal = await tx.animal.create({
        data: { tenantId: params.tenantId, farmId: params.farmId, speciesId, breedId,
          internalCode: row.code, sex: row.sex, productiveLine: row.line, birthDate: row.birthDate,
          initialWeightKg: row.weight, currentWeightKg: row.weight, lotOrZone: row.lot || null },
      });
      await tx.animalEvent.create({
        data: { tenantId: params.tenantId, animalId: animal.id, actorUserId: params.actorUserId,
          eventType: "ENTRY", title: "Ingreso desde inventario", description: "Importado desde archivo validado", eventDate: new Date() },
      });
    }
    await tx.auditLog.create({ data: { tenantId: params.tenantId, actorUserId: params.actorUserId,
      entityType: "FARM", entityId: params.farmId, action: "LIVESTOCK_BATCH_IMPORTED",
      metadata: { quantity: rows.length, source: "CSV_XLSX", filename: params.filename.slice(0, 120) } } });
    return { imported: rows.length, farmId: params.farmId };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30000, maxWait: 10000 });
  return result;
}
