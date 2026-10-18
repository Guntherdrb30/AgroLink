import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { reproductiveStatusAfter, REPRODUCTION_LABELS, type ReproductionMetadata } from "@/lib/livestock/reproduction";
import type { ReproductionRecordInput } from "@/lib/validators/reproduction";

export async function registerReproductionEvent(tenantId: string, actorUserId: string, input: ReproductionRecordInput) {
  return prisma.$transaction(async tx => {
    const animal = await tx.animal.findFirst({
      where: { id: input.animalId, tenantId },
      select: { id: true, sex: true, reproductiveStatus: true },
    });
    if (!animal) throw new Error("ANIMAL_NOT_FOUND");
    if (animal.sex !== "FEMALE") throw new Error("REPRODUCTION_FEMALE_REQUIRED");
    const eventDate = new Date(input.eventDate + "T00:00:00Z");
    const metadata: ReproductionMetadata = {
      module: "GANADIA_REPRODUCTION", kind: input.kind,
      ...(input.method ? { method: input.method } : {}),
      ...(input.pregnancyResult ? { result: input.pregnancyResult } : {}),
      ...(input.sireCode ? { sireCode: input.sireCode } : {}),
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
        metadata: { eventId: event.id, kind: input.kind } },
    });
    return event;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
