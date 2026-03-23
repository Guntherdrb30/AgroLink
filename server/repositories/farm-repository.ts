import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export function listFarmsByTenant(tenantId: string) {
  return prisma.farm.findMany({
    where: { tenantId },
    include: {
      verificationProfile: true,
      verificationDocs: true,
      primaryImageFile: true,
      logoFile: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export function findFarmById(farmId: string) {
  return prisma.farm.findUnique({
    where: { id: farmId },
    include: {
      primaryImageFile: true,
      logoFile: true,
      verificationProfile: {
        include: {
          documents: {
            include: {
              file: true,
            },
          },
          audits: {
            include: {
              actor: true,
            },
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      },
      verificationDocs: {
        include: {
          file: true,
        },
      },
    },
  });
}

export function createFarm(data: Prisma.FarmCreateInput) {
  return prisma.farm.create({
    data,
    include: {
      verificationProfile: true,
    },
  });
}

export function updateFarm(
  farmId: string,
  data: Prisma.FarmUpdateInput | Prisma.FarmUncheckedUpdateInput,
) {
  return prisma.farm.update({
    where: { id: farmId },
    data,
    include: {
      verificationProfile: true,
    },
  });
}

export function deleteFarm(farmId: string) {
  return prisma.farm.delete({
    where: { id: farmId },
  });
}
