import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { reproductiveStatusAfter, REPRODUCTION_LABELS, type ReproductionMetadata } from "@/lib/livestock/reproduction";
import type { ReproductionRecordInput } from "@/lib/validators/reproduction";

export async function registerReproductionEvent(tenantId: string, actorUserId: string, input: ReproductionRecordInput) {
  return prisma.$transaction(async tx => {
    const animal = await tx.animal.findFirst({
      where: { id: input.animalId, tenantId },
      select: { id: true, sex: true, reproductiveStatus: true, farmId: true, speciesId: true, breedId: true },
    });
    if (!animal) throw new Error("ANIMAL_NOT_FOUND");
    if (animal.sex !== "FEMALE") throw new Error("REPRODUCTION_FEMALE_REQUIRED");
    const eventDate = new Date(input.eventDate + "T00:00:00Z");
    let sireId = input.sireId ?? null;
    if (sireId) {
      const sire = await tx.animal.findFirst({ where: { id: sireId, tenantId, sex: "MALE", speciesId: animal.speciesId }, select: { id: true } });
      if (!sire) throw new Error("INVALID_SIRE");
    }
    if (input.kind === "CALVING" && !sireId) {
      const lastService = await tx.animalEvent.findFirst({
        where: { tenantId, animalId: animal.id, eventType: "REPRODUCTION", eventDate: { lte: eventDate },
          metadata: { path: ["kind"], equals: "SERVICE" } },
        orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
        select: { metadata: true },
      });
      const candidate = lastService?.metadata && typeof lastService.metadata === "object" && !Array.isArray(lastService.metadata) ?
        (lastService.metadata as Record<string, unknown>).sireId : null;
      if (typeof candidate === "string") {
        const verified = await tx.animal.findFirst({ where: { id: candidate, tenantId, sex: "MALE", speciesId: animal.speciesId }, select: { id: true } });
        if (verified) sireId = verified.id;
      }
    }
    let calfId: string | null = null;
    if (input.kind === "CALVING" && input.calfCode) {
      const duplicate = await tx.animal.findFirst({ where: { tenantId, internalCode: { equals: input.calfCode, mode: "insensitive" } }, select: { id: true } });
      if (duplicate) throw new Error("CALF_CODE_EXISTS");
      const calf = await tx.animal.create({ data: {
        tenantId, farmId: animal.farmId, speciesId: animal.speciesId, breedId: animal.breedId,
        internalCode: input.calfCode, sex: input.calfSex ?? "UNKNOWN", motherId: animal.id,
        fatherId: sireId, birthDate: eventDate, reproductiveStatus: "YOUNG", productiveLine: "BREEDING",
      } });
      calfId = calf.id;
      await tx.animalEvent.create({ data: { tenantId, animalId: calfId, actorUserId, eventType: "BIRTH",
        title: "Nacimiento registrado", eventDate, metadata: { motherId: animal.id, fatherId: sireId } } });
    }
    const metadata: ReproductionMetadata = {
      module: "GANADIA_REPRODUCTION", kind: input.kind,
      ...(input.method ? { method: input.method } : {}),
      ...(input.pregnancyResult ? { result: input.pregnancyResult } : {}),
      ...(input.sireCode ? { sireCode: input.sireCode } : {}),
      ...(sireId ? { sireId } : {}),
      ...(calfId ? { calfId } : {}),
      ...(input.calfSex ? { calfSex: input.calfSex } : {}),
      ...(input.calfCode ? { calfCode: input.calfCode } : {}),
      ...(input.nextCheckAt ? { nextCheckAt: input.nextCheckAt } : {}),
      ...(input.expectedCalvingAt ? { expectedCalvingAt: input.expectedCalvingAt } : {}),
    };
    const status = reproductiveStatusAfter(animal.reproductiveStatus, input.kind, input.pregnancyResult);
    if (status !== animal.reproductiveStatus) metadata.stateAfter = status;
    const event = await tx.animalEvent.create({
      data: {
        tenantId, animalId: animal.id, actorUserId, eventType: "REPRODUCTION",
        title: REPRODUCTION_LABELS[input.kind], description: input.note || null,
        eventDate, metadata: metadata as unknown as Prisma.InputJsonValue,
      },
    });
    if (status !== animal.reproductiveStatus) {
      await tx.animal.updateMany({
        where: { id: animal.id, tenantId },
        data: { reproductiveStatus: status },
      });
    }
    await tx.auditLog.create({
      data: { tenantId, actorUserId, entityType: "ANIMAL",
        entityId: animal.id, action: "REPRODUCTION_RECORDED",
        metadata: { eventId: event.id, kind: input.kind, calfId, sireId } },
    });
    return event;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
