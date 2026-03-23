import type { Prisma, PlatformRole } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

const authContextInclude = {
  memberships: {
    include: {
      tenant: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  },
  defaultTenant: true,
} satisfies Prisma.UserInclude;

export function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

export function findUserAuthContextById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: authContextInclude,
  });
}

export function findUserWithMemberships(userId: string) {
  return findUserAuthContextById(userId);
}

export function createUser(data: Prisma.UserCreateInput) {
  return prisma.user.create({ data });
}

export function updateUserDefaultTenant(userId: string, tenantId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { defaultTenantId: tenantId },
  });
}

export function updateUserPassword(userId: string, hashedPassword: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { hashedPassword },
  });
}

export function updateUserPlatformRole(userId: string, platformRole: PlatformRole | null) {
  return prisma.user.update({
    where: { id: userId },
    data: { platformRole },
  });
}

export function touchUserEmailVerified(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { emailVerified: new Date() },
  });
}
