import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export function createAccessAudit(data: Prisma.AccessAuditUncheckedCreateInput) {
  return prisma.accessAudit.create({ data });
}
