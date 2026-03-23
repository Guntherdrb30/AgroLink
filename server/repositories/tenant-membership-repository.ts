import type { Prisma, TenantRole } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export function findMembershipByUserAndTenant(userId: string, tenantId: string) {
  return prisma.tenantMembership.findUnique({
    where: {
      tenantId_userId: {
        tenantId,
        userId,
      },
    },
    include: {
      tenant: true,
    },
  });
}

export function listMembershipsByUser(userId: string) {
  return prisma.tenantMembership.findMany({
    where: { userId },
    include: {
      tenant: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

export function createTenantMembership(data: Prisma.TenantMembershipCreateInput) {
  return prisma.tenantMembership.create({ data });
}

export function setMembershipDefault(userId: string, tenantId: string) {
  return prisma.$transaction([
    prisma.tenantMembership.updateMany({
      where: { userId },
      data: { isDefault: false },
    }),
    prisma.tenantMembership.update({
      where: {
        tenantId_userId: {
          tenantId,
          userId,
        },
      },
      data: { isDefault: true },
    }),
  ]);
}

export function userHasTenantRole(userId: string, tenantId: string, roles: TenantRole[]) {
  return prisma.tenantMembership.findFirst({
    where: {
      userId,
      tenantId,
      role: {
        in: roles,
      },
    },
  });
}
