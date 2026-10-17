"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import { assertIsolatedPreviewDatabase } from "@/lib/security/preview-db-isolation";
import { requireAuth } from "@/lib/auth/session";
import { slugify } from "@/lib/utils/slugify";
import { recordAccessAudit } from "@/server/services/access-audit-service";

const schema = z.object({ tenantName: z.string().trim().min(3).max(120) });

export async function createFirstTenantAction(formData: FormData) {
  assertIsolatedPreviewDatabase();
  const user = await requireAuth();
  const parsed = schema.safeParse({ tenantName: formData.get("tenantName") });
  if (!parsed.success) redirect("/onboarding?error=validation");

  // A user must not create a second tenant by repeating the onboarding POST.
  const existing = await prisma.tenantMembership.findFirst({ where: { userId: user.id } });
  if (existing) redirect("/dashboard");

  await prisma.$transaction(async (tx) => {
    // Serialize onboarding per user; concurrent submissions cannot create two memberships.
    const current = await tx.user.findUnique({ where: { id: user.id }, select: { defaultTenantId: true } });
    if (!current || current.defaultTenantId) throw new Error("ACCOUNT_ALREADY_ONBOARDED");

    const tenant = await tx.tenant.create({
      data: {
        name: parsed.data.tenantName,
        slug: `${slugify(parsed.data.tenantName)}-${randomUUID().slice(0, 8)}`,
      },
    });
    await tx.user.updateMany({
      where: { id: user.id, defaultTenantId: null },
      data: { defaultTenantId: tenant.id },
    }).then(async ({ count }) => {
      if (count !== 1) throw new Error("ACCOUNT_ALREADY_ONBOARDED");
    });
    await tx.tenantMembership.create({
      data: { tenantId: tenant.id, userId: user.id, role: "TENANT_OWNER", isDefault: true },
    });
    await tx.verificationProfile.create({
      data: { tenantId: tenant.id, subjectType: "TENANT", subjectId: tenant.id, status: "PENDING" },
    });
  });
  await recordAccessAudit({ action: "ONBOARDING_TENANT_CREATED", userId: user.id, email: user.email, provider: "clerk" });
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
