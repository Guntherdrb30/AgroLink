import { prisma } from "@/lib/db/prisma";
import { allowedFarmIds } from "@/lib/permissions/farm-access";

/**
 * Server-only boundary. Both company membership and farm assignment are checked.
 * Call before accessing records or writing; never trust farm IDs from a form.
 */
type Scope = { tenantId: string; userId: string; role: string };

export async function assertFarmScope(scope: Scope, farmId: string) {
  const farm = await prisma.farm.findFirst({
    where: { id: farmId, tenantId: scope.tenantId },
    select: { id: true },
  });
  if (!farm) throw new Error("FARM_ACCESS_DENIED");
  const grants = await allowedFarmIds(scope.tenantId, scope.userId, scope.role);
  if (grants && !grants.includes(farmId)) throw new Error("FARM_ACCESS_DENIED");
}

export async function assertAnimalScope(scope: Scope, animalId: string) {
  const animal = await prisma.animal.findFirst({
    where: { id: animalId, tenantId: scope.tenantId },
    select: { farmId: true },
  });
  if (!animal) throw new Error("ANIMAL_ACCESS_DENIED");
  await assertFarmScope(scope, animal.farmId);
  return animal.farmId;
}

export async function assertOperationScope(scope: Scope, operationId: string) {
  const operation = await prisma.livestockOperation.findFirst({
    where: { id: operationId, tenantId: scope.tenantId },
    select: { farmId: true },
  });
  if (!operation) throw new Error("OPERATION_ACCESS_DENIED");
  await assertFarmScope(scope, operation.farmId);
  return operation.farmId;
}

export async function assertOperationAnimalScope(scope: Scope, operationId: string, operationAnimalId: string) {
  const row = await prisma.livestockOperationAnimal.findFirst({
    where: { id: operationAnimalId, operationId, tenantId: scope.tenantId },
    select: { id: true },
  });
  if (!row) throw new Error("OPERATION_ANIMAL_ACCESS_DENIED");
  await assertOperationScope(scope, operationId);
}
