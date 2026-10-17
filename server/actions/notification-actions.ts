"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { recordAccessAudit } from "@/server/services/access-audit-service";
import { sendVerificationNotification } from "@/server/services/notification-email-service";

export async function sendWelcomeEmailAction() {
  const { user, tenantContext } = await requireRole({ tenant: ["TENANT_OWNER", "TENANT_ADMIN"] });
  if (!tenantContext) redirect("/verification?email=unauthorized");
  const now = Date.now();
  const recent = await prisma.accessAudit.findFirst({
    where: {
      userId: user.id,
      tenantId: tenantContext.tenant.id,
      action: "EMAIL_WELCOME_REQUESTED",
      createdAt: { gt: new Date(now - 15 * 60 * 1000) },
    },
    orderBy: { createdAt: "desc" },
  });
  if (recent) redirect("/verification?email=too_soon");

  const result = await sendVerificationNotification({
    event: "welcome",
    tenantId: tenantContext.tenant.id,
    to: user.email,
    recipientName: user.name ?? "",
    tenantName: tenantContext.tenant.name,
    idempotencyKey: `agrolynk-welcome-manual-${tenantContext.tenant.id}-${user.id}-${Math.floor(now / (15 * 60 * 1000))}`,
  });

  if (result.status === "accepted") {
    await recordAccessAudit({ action: "EMAIL_WELCOME_REQUESTED", userId: user.id, tenantId: tenantContext.tenant.id, provider: "resend" });
  }
  redirect(`/verification?email=${result.status}`);
}
