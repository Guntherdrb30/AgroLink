import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export function listEmployeesByTenant(tenantId: string) {
  return prisma.employee.findMany({
    where: {
      tenantId,
      active: true,
    },
    orderBy: {
      fullName: "asc",
    },
  });
}

export function listLivestockOperationsByTenant(tenantId: string) {
  return prisma.livestockOperation.findMany({
    where: { tenantId },
    include: {
      farm: true,
      animals: true,
      sheets: {
        orderBy: {
          createdAt: "desc",
        },
      },
      expenses: true,
      workers: true,
    },
    orderBy: {
      operationDate: "desc",
    },
  });
}

export function findLivestockOperationById(operationId: string) {
  return prisma.livestockOperation.findUnique({
    where: { id: operationId },
    include: {
      farm: true,
      createdBy: true,
      animals: {
        include: {
          animal: {
            include: {
              farm: true,
              species: true,
              breed: true,
            },
          },
        },
        orderBy: {
          internalCodeSnapshot: "asc",
        },
      },
      sheets: {
        include: {
          file: true,
          generatedBy: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      expenses: {
        orderBy: {
          createdAt: "desc",
        },
      },
      workers: {
        include: {
          employee: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });
}

export function createLivestockOperation(
  data: Prisma.LivestockOperationUncheckedCreateInput,
) {
  return prisma.livestockOperation.create({ data });
}

export function createOperationAnimals(
  data: Prisma.LivestockOperationAnimalUncheckedCreateInput[],
) {
  return prisma.livestockOperationAnimal.createMany({ data });
}

export function updateLivestockOperation(
  operationId: string,
  data:
    | Prisma.LivestockOperationUpdateInput
    | Prisma.LivestockOperationUncheckedUpdateInput,
) {
  return prisma.livestockOperation.update({
    where: { id: operationId },
    data,
  });
}

export function countOperationSheets(
  operationId: string,
  type: import("@prisma/client").LivestockOperationSheetType,
) {
  return prisma.livestockOperationSheet.count({
    where: {
      operationId,
      type,
    },
  });
}

export function createOperationSheet(
  data: Prisma.LivestockOperationSheetUncheckedCreateInput,
) {
  return prisma.livestockOperationSheet.create({ data });
}

export function findOperationAnimalById(operationAnimalId: string) {
  return prisma.livestockOperationAnimal.findUnique({
    where: { id: operationAnimalId },
    include: {
      animal: true,
      operation: true,
    },
  });
}

export function updateOperationAnimal(
  operationAnimalId: string,
  data:
    | Prisma.LivestockOperationAnimalUpdateInput
    | Prisma.LivestockOperationAnimalUncheckedUpdateInput,
) {
  return prisma.livestockOperationAnimal.update({
    where: { id: operationAnimalId },
    data,
    include: {
      animal: true,
      operation: true,
    },
  });
}

export function listOperationAnimals(operationId: string) {
  return prisma.livestockOperationAnimal.findMany({
    where: { operationId },
    include: {
      animal: true,
    },
    orderBy: {
      internalCodeSnapshot: "asc",
    },
  });
}

export function createOperationExpense(
  data: Prisma.OperationExpenseUncheckedCreateInput,
) {
  return prisma.operationExpense.create({ data });
}

export function createOperationWorker(
  data: Prisma.OperationWorkerUncheckedCreateInput,
) {
  return prisma.operationWorker.create({ data });
}
