"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

  await submitVerificationProfile(tenantContext.tenant.id, parsed.data.profileId, user.id);

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

  await reviewVerificationProfile({
    profileId: parsed.data.profileId,
    actorUserId: user.id,
    action: parsed.data.action,
    comment: parsed.data.comment,
  });

  revalidatePath("/admin/verification");
  revalidatePath("/verification");
  revalidatePath("/farms");
  redirect("/admin/verification?success=reviewed");
}
