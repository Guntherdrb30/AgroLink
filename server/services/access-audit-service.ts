import type { Prisma } from "@prisma/client";
import { headers } from "next/headers";

import { createAccessAudit } from "@/server/repositories/access-audit-repository";

type AccessAuditInput = {
  action: string;
  userId?: string | null;
  tenantId?: string | null;
  email?: string | null;
  provider?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export async function recordAccessAudit(input: AccessAuditInput) {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for");
  const realIp = requestHeaders.get("x-real-ip");

  return createAccessAudit({
    action: input.action,
    userId: input.userId ?? null,
    tenantId: input.tenantId ?? null,
    email: input.email ?? null,
    provider: input.provider ?? null,
    ipAddress: forwardedFor?.split(",")[0]?.trim() || realIp || null,
    userAgent: requestHeaders.get("user-agent"),
    metadata: input.metadata,
  });
}
