import type {
  Prisma,
  VerificationDocumentType,
  VerificationStatus,
  VerificationSubjectType,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export function createVerificationProfile(data: Prisma.VerificationProfileUncheckedCreateInput) {
  return prisma.verificationProfile.create({ data });
}

export function findTenantVerificationProfile(tenantId: string) {
  return prisma.verificationProfile.findFirst({
    where: {
      tenantId,
      subjectType: "TENANT",
      subjectId: tenantId,
    },
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
  });
}

export function findVerificationProfileById(profileId: string) {
  return prisma.verificationProfile.findUnique({
    where: { id: profileId },
    include: {
      tenant: true,
      farm: true,
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
  });
}

export function findFarmVerificationProfile(farmId: string) {
  return prisma.verificationProfile.findUnique({
    where: {
      farmId,
    },
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
      farm: true,
      tenant: true,
    },
  });
}

export function listVerificationProfilesForReview(statuses?: VerificationStatus[]) {
  return prisma.verificationProfile.findMany({
    where: statuses?.length
      ? {
          status: {
            in: statuses,
          },
        }
      : undefined,
    include: {
      tenant: true,
      farm: true,
      documents: {
        include: {
          file: true,
        },
      },
      audits: {
        orderBy: {
          createdAt: "desc",
        },
        take: 3,
        include: {
          actor: true,
        },
      },
    },
    orderBy: [
      {
        submittedAt: "desc",
      },
      {
        updatedAt: "desc",
      },
    ],
  });
}

export function createVerificationDocument(
  data: Prisma.VerificationDocumentUncheckedCreateInput,
) {
  return prisma.verificationDocument.create({ data });
}

export function deleteVerificationDocumentsByTypes(
  profileId: string,
  types: VerificationDocumentType[],
) {
  return prisma.verificationDocument.deleteMany({
    where: {
      profileId,
      type: {
        in: types,
      },
    },
  });
}

export function updateVerificationProfile(
  profileId: string,
  data: Prisma.VerificationProfileUncheckedUpdateInput,
) {
  return prisma.verificationProfile.update({
    where: { id: profileId },
    data,
  });
}

export function createVerificationAudit(
  data: Prisma.VerificationAuditUncheckedCreateInput,
) {
  return prisma.verificationAudit.create({ data });
}

export function countVerificationDocuments(profileId: string) {
  return prisma.verificationDocument.count({
    where: { profileId },
  });
}

export function listVerificationProfilesByTenant(tenantId: string) {
  return prisma.verificationProfile.findMany({
    where: { tenantId },
    include: {
      farm: true,
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
    orderBy: {
      createdAt: "asc",
    },
  });
}

export function ensureVerificationProfile(
  tenantId: string,
  subjectType: VerificationSubjectType,
  subjectId: string,
  farmId?: string,
) {
  return prisma.verificationProfile.upsert({
    where: {
      tenantId_subjectType_subjectId: {
        tenantId,
        subjectType,
        subjectId,
      },
    },
    update: {
      farmId: farmId ?? null,
    },
    create: {
      tenantId,
      subjectType,
      subjectId,
      farmId: farmId ?? null,
    },
  });
}
