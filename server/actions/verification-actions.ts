"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { sendVerificationNotification } from "@/server/services/notification-email-service";
import { recordAccessAudit } from "@/server/services/access-audit-service";
import { redirect } from "next/navigation";

import { assertFarmScope } from "@/lib/permissions/assert-farm-scope";
import { getCurrentTenant, requireAuth, requireRole } from "@/lib/auth/session";
import { submitVerificationSchema, verificationReviewSchema } from "@/lib/validators/verification";
import {
  reviewVerificationProfile,
  submitVerificationProfile,
  uploadFarmVerificationDocuments,
  uploadTenantVerificationDocuments,
} from "@/server/services/verification-service";

export async function uploadTenantVerificationDocumentsAction(formData: FormData) {
  const { user, tenantContext } = await requireRole({
    tenant: ["TENANT_OWNER", "TENANT_ADMIN"],
  });

  if (!tenantContext) {
    redirect("/verification?error=tenant");
  }

  await uploadTenantVerificationDocuments(tenantContext.tenant.id, user.id, formData);

  revalidatePath("/verification");
  redirect("/verification?success=documents_uploaded");
}

export async function uploadFarmVerificationDocumentsAction(formData: FormData) {
  const { user, tenantContext } = await requireRole({
    tenant: ["TENANT_OWNER", "TENANT_ADMIN", "FARM_MANAGER"],
  });

  if (!tenantContext) {
    redirect("/farms?error=tenant");
  }

  const farmId = formData.get("farmId");

  if (typeof farmId !== "string" || !farmId) {
    redirect("/farms?error=missing_farm");
  }

  await assertFarmScope({tenantId:tenantContext.tenant.id,userId:user.id,role:tenantContext.membership.role},farmId);
  await uploadFarmVerificationDocuments(tenantContext.tenant.id, farmId, user.id, formData);

  revalidatePath(`/farms/${farmId}`);
  redirect(`/farms/${farmId}?success=documents_uploaded`);
}

export async function submitVerificationProfileAction(formData: FormData) {
  const user = await requireAuth();
  const tenantContext = await getCurrentTenant();

  if (!tenantContext) {
    redirect("/verification?error=tenant");
  }

  const parsed = submitVerificationSchema.safeParse({
    profileId: formData.get("profileId"),
  });

  if (!parsed.success) {
    redirect("/verification?error=profile");
  }

  const target = await prisma.verificationProfile.findFirst({
    where:{id:parsed.data.profileId,tenantId:tenantContext.tenant.id},
    select:{subjectType:true,farmId:true},
  });
  if(!target)redirect("/verification?error=profile");
  if(target.subjectType==="TENANT"&&!["TENANT_OWNER","TENANT_ADMIN"].includes(tenantContext.membership.role))redirect("/dashboard");
  if(target.subjectType==="FARM"){
    if(!["TENANT_OWNER","TENANT_ADMIN","FARM_MANAGER"].includes(tenantContext.membership.role)||!target.farmId)redirect("/dashboard");
    await assertFarmScope({tenantId:tenantContext.tenant.id,userId:user.id,role:tenantContext.membership.role},target.farmId);
  }
  const profile = await submitVerificationProfile(tenantContext.tenant.id, parsed.data.profileId, user.id);
  await sendVerificationNotification({
    event: "submitted",
    tenantId: tenantContext.tenant.id,
    to: user.email,
    recipientName: user.name ?? "",
    tenantName: tenantContext.tenant.name,
    subjectLabel: profile.subjectType === "FARM" ? "finca" : "empresa",
    idempotencyKey: `agrolynk-submitted-${profile.id}-${profile.updatedAt.getTime()}`,
  });

  revalidatePath("/verification");
  revalidatePath("/farms");
  redirect("/verification?success=submitted");
}

export async function reviewVerificationProfileAction(formData: FormData) {
  const { user } = await requireRole({
    platform: ["ROOT", "PLATFORM_ADMIN"],
  });

  const parsed = verificationReviewSchema.safeParse({
    profileId: formData.get("profileId"),
    action: formData.get("action"),
    comment: formData.get("comment"),
  });

  if (!parsed.success) {
    redirect("/admin/verification?error=validation");
  }

  const reviewed = await reviewVerificationProfile({
    profileId: parsed.data.profileId,
    actorUserId: user.id,
    action: parsed.data.action,
    comment: parsed.data.comment,
  });
  const event = ({
    approve: "approved",
    request_fix: "needs_changes",
    reject: "rejected",
    start_review: "review_started",
  } as const)[parsed.data.action];
  const members = await prisma.tenantMembership.findMany({
    where: { tenantId: reviewed.tenantId, role: { in: ["TENANT_OWNER", "TENANT_ADMIN"] } },
    include: { user: { select: { email: true, name: true } }, tenant: { select: { name: true } } },
  });
  await Promise.all(members.map(member => sendVerificationNotification({
    event,
    tenantId: reviewed.tenantId,
    to: member.user.email,
    recipientName: member.user.name ?? "",
    tenantName: member.tenant.name,
    subjectLabel: reviewed.subjectType === "FARM" ? "finca" : "empresa",
    idempotencyKey: `agrolynk-review-${reviewed.id}-${reviewed.updatedAt.getTime()}-${member.userId}`,
  })));

  revalidatePath("/admin/verification");
  revalidatePath("/verification");
  revalidatePath("/farms");
  redirect("/admin/verification?success=reviewed");
}
