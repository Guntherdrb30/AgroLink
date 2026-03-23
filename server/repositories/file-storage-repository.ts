import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export function createFileStorageRecord(data: Prisma.FileStorageUncheckedCreateInput) {
  return prisma.fileStorage.create({ data });
}

export function findFileStorageById(fileId: string) {
  return prisma.fileStorage.findUnique({
    where: { id: fileId },
  });
}

export function listFilesByEntity(entityType: string, entityId: string) {
  return prisma.fileStorage.findMany({
    where: {
      entityType,
      entityId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export function listFilesForEntities(entityType: string, entityIds: string[]) {
  if (entityIds.length === 0) {
    return Promise.resolve([]);
  }

  return prisma.fileStorage.findMany({
    where: {
      entityType,
      entityId: {
        in: entityIds,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export function deleteFileStorageRecord(fileId: string) {
  return prisma.fileStorage.delete({
    where: { id: fileId },
  });
}
