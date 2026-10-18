import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

type OperationRow = {
  status: string;
  appliedToAnimalHistory: boolean;
  weightKg: Prisma.Decimal | null;
  vaccineName: string | null;
  dewormingName: string | null;
  treatmentName: string | null;
  observations: string | null;
  generalStatus: string;
};

export function canApplyCapturedOperation(status: string, rows: OperationRow[]): boolean {
  return status === "RESULTS_CAPTURED" &&
    rows.some(row => row.status === "CAPTURED" && !row.appliedToAnimalHistory) &&
    rows.every(row => row.status !== "PENDING" && !row.appliedToAnimalHistory);
}

function healthFromGeneral(status: string): "HEALTHY" | "UNDER_OBSERVATION" | "SICK" | null {
  if (status === "GOOD") return "HEALTHY";
  if (status === "UNDER_OBSERVATION") return "UNDER_OBSERVATION";
  if (status === "SICK" || status === "CRITICAL") return "SICK";
  return null;
}

/**
 * Atomic, tenant-scoped application. If any animal update fails, no new
 * weights, vaccinations, treatments or application flags are committed.
 * A repeated click is a no-op once the operation is marked APPLIED.
 */
export async function applyOperationResultsAtomically(
  tenantId: string,
  actorUserId: string,
  operationId: string,
) {
  try {
    return await prisma.$transaction(async tx => {
      const operation = await tx.livestockOperation.findFirst({
        where: { id: operationId, tenantId },
        include: { animals: true },
      });
      if (!operation) throw new Error("OPERATION_NOT_FOUND");
      if (operation.status === "APPLIED") return operation;
      if (!canApplyCapturedOperation(operation.status, operation.animals)) {
        throw new Error("OPERATION_RESULTS_NOT_READY");
      }

      const captured = operation.animals.filter(row =>
        row.status === "CAPTURED" && !row.appliedToAnimalHistory,
      );
      const farmAnimals = await tx.animal.findMany({
        where: { tenantId, farmId: operation.farmId, id: { in: captured.map(row => row.animalId) } },
        select: { id: true },
      });
      if (farmAnimals.length !== captured.length) throw new Error("OPERATION_ANIMAL_SCOPE_MISMATCH");

      const now = new Date();
      for (const row of captured) {
        const applied = await tx.livestockOperationAnimal.updateMany({
          where: { id: row.id, tenantId, operationId, appliedToAnimalHistory: false, status: "CAPTURED" },
          data: { appliedToAnimalHistory: true, appliedAt: now, status: "APPLIED" },
        });
        if (applied.count !== 1) throw new Error("OPERATION_ALREADY_APPLIED");

        if (row.weightKg) {
          await tx.animalWeightRecord.create({
            data: { tenantId, animalId: row.animalId, recordedById: actorUserId,
              weightKg: row.weightKg, recordedAt: operation.operationDate,
              note: `Jornada: ${operation.title}` },
          });
          // An older field day must not overwrite a more recent weighing.
          const recent = await tx.animalWeightRecord.count({
            where: { tenantId, animalId: row.animalId, recordedAt: { gt: operation.operationDate } },
          });
          if (!recent) {
            await tx.animal.updateMany({
              where: { id: row.animalId, tenantId, farmId: operation.farmId },
              data: { currentWeightKg: row.weightKg },
            });
          }
        }
        if (row.vaccineName) {
          await tx.animalVaccinationRecord.create({
            data: { tenantId, animalId: row.animalId, recordedById: actorUserId,
              vaccineName: row.vaccineName, appliedAt: operation.operationDate,
              note: `Jornada: ${operation.title}` },
          });
        }
        for (const [name, diagnosis] of [
          [row.dewormingName, "Desparasitación"],
          [row.treatmentName, null],
        ] as const) {
          if (name) await tx.animalTreatmentRecord.create({
            data: { tenantId, animalId: row.animalId, recordedById: actorUserId,
              treatmentName: name, appliedAt: operation.operationDate,
              diagnosis, note: `Jornada: ${operation.title}` },
          });
        }
        const health = healthFromGeneral(row.generalStatus);
        if (health) await tx.animal.updateMany({
          where: { id: row.animalId, tenantId, farmId: operation.farmId },
          data: { healthStatus: health },
        });
        await tx.animalEvent.create({
          data: { tenantId, animalId: row.animalId, actorUserId, eventType: "NOTE",
            title: `Jornada: ${operation.title}`,
            description: row.observations ?? `Estado general: ${row.generalStatus}`,
            eventDate: operation.operationDate,
            metadata: { operationId, operationAnimalId: row.id } },
        });
      }
      const changed = await tx.livestockOperation.updateMany({
        where: { id: operationId, tenantId, status: "RESULTS_CAPTURED" },
        data: { status: "APPLIED", resultsAppliedAt: now },
      });
      if (changed.count !== 1) throw new Error("OPERATION_ALREADY_APPLIED");
      await tx.auditLog.create({
        data: { tenantId, actorUserId, entityType: "LIVESTOCK_OPERATION",
          entityId: operationId, action: "RESULTS_APPLIED",
          metadata: { appliedAnimals: captured.length } },
      });
      return { ...operation, status: "APPLIED" as const, resultsAppliedAt: now };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 60000, maxWait: 10000 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      throw new Error("OPERATION_CONCURRENT_UPDATE");
    }
    throw error;
  }
}
