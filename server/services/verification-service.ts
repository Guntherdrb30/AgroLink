import type { VerificationDocumentType, VerificationStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  countVerificationDocuments,
  createVerificationAudit,
  createVerificationDocument,
  findFarmVerificationProfile,
  findTenantVerificationProfile,
  findVerificationProfileById,
  updateVerificationProfile,
} from "@/server/repositories/verification-repository";
import { storeFile } from "@/server/services/file-storage-service";

const tenantDocumentGroups: Array<{
  fieldName: string;
  type: VerificationDocumentType;
  label: string;
}> = [
  { fieldName: "identityDocuments", type: "IDENTITY", label: "Identity document" },
  { fieldName: "companyDocuments", type: "COMPANY", label: "Company document" },
];

const farmDocumentGroups: Array<{
  fieldName: string;
  type: VerificationDocumentType;
  label: string;
}> = [
  { fieldName: "farmDocuments", type: "FARM_DOCUMENT", label: "Farm document" },
  { fieldName: "intiDocuments", type: "INTI", label: "INTI document" },
  { fieldName: "farmPhotos", type: "FARM_PHOTO", label: "Farm photo" },
];

async function uploadDocumentsForProfile(params: {
  tenantId: string;
  profileId: string;
  actorUserId: string;
  farmId?: string | null;
  groups: Array<{
    fieldName: string;
    type: VerificationDocumentType;
    label: string;
  }>;
  formData: FormData;
}) {
  const createdDocs: string[] = [];

  for (const group of params.groups) {
    const files = params.formData
      .getAll(group.fieldName)
      .filter((value): value is File => value instanceof File && value.size > 0);

    for (const file of files) {
      const storedFile = await storeFile({
        tenantId: params.tenantId,
        uploadedById: params.actorUserId,
        file,
        usage: "verification_document",
        label: group.label,
        entityType: params.farmId ? "farm_verification" : "tenant_verification",
        entityId: params.farmId ?? params.profileId,
        metadata: {
          verificationType: group.type,
          farmId: params.farmId ?? null,
        },
      });

      const document = await createVerificationDocument({
        tenantId: params.tenantId,
        profileId: params.profileId,
        farmId: params.farmId ?? null,
        fileId: storedFile.id,
        type: group.type,
        label: group.label,
        fileName: storedFile.originalName,
        blobUrl: storedFile.url,
        blobPath: storedFile.path,
        contentType: storedFile.mimeType,
        size: storedFile.size,
        uploadedById: params.actorUserId,
      });

      createdDocs.push(document.id);
    }
  }

  return createdDocs;
}

export async function uploadTenantVerificationDocuments(
  tenantId: string,
  actorUserId: string,
  formData: FormData,
) {
  const profile = await findTenantVerificationProfile(tenantId);

  if (!profile) {
    throw new Error("VERIFICATION_PROFILE_NOT_FOUND");
  }

  const createdDocs = await uploadDocumentsForProfile({
    tenantId,
    profileId: profile.id,
    actorUserId,
    groups: tenantDocumentGroups,
    formData,
  });

  await createVerificationAudit({
    tenantId,
    profileId: profile.id,
    actorUserId,
    action: "DOCUMENTS_UPLOADED",
    statusFrom: profile.status,
    statusTo: profile.status,
    comment: `Uploaded ${createdDocs.length} tenant verification documents.`,
  });

  return createdDocs;
}

export async function uploadFarmVerificationDocuments(
  tenantId: string,
  farmId: string,
  actorUserId: string,
  formData: FormData,
) {
  const profile = await findFarmVerificationProfile(farmId);

  if (!profile || profile.tenantId !== tenantId) {
    throw new Error("VERIFICATION_PROFILE_NOT_FOUND");
  }

  const createdDocs = await uploadDocumentsForProfile({
    tenantId,
    profileId: profile.id,
    actorUserId,
    farmId,
    groups: farmDocumentGroups,
    formData,
  });

  await createVerificationAudit({
    tenantId,
    profileId: profile.id,
    actorUserId,
    action: "DOCUMENTS_UPLOADED",
    statusFrom: profile.status,
    statusTo: profile.status,
    comment: `Uploaded ${createdDocs.length} farm verification documents.`,
  });

  return createdDocs;
}

export async function submitVerificationProfile(
  tenantId: string,
  profileId: string,
  actorUserId: string,
) {
  const profile = await findVerificationProfileById(profileId);

  if (!profile || profile.tenantId !== tenantId) {
    throw new Error("VERIFICATION_PROFILE_NOT_FOUND");
  }

  const documentsCount = await countVerificationDocuments(profileId);

  if (documentsCount === 0) {
    throw new Error("VERIFICATION_DOCUMENTS_REQUIRED");
  }

  const updatedProfile = await updateVerificationProfile(profileId, {
    status: "IN_REVIEW",
    submittedAt: new Date(),
  });

  await createVerificationAudit({
    tenantId,
    profileId,
    actorUserId,
    action: "SUBMITTED_FOR_REVIEW",
    statusFrom: profile.status,
    statusTo: "IN_REVIEW",
    comment: "Profile submitted for verification review.",
  });

  return updatedProfile;
}

export async function reviewVerificationProfile(params: {
  profileId: string;
  actorUserId: string;
  action: "approve" | "request_fix" | "reject" | "start_review";
  comment?: string;
}) {
  const profile = await findVerificationProfileById(params.profileId);

  if (!profile) {
    throw new Error("VERIFICATION_PROFILE_NOT_FOUND");
  }

  const actionMap: Record<
    typeof params.action,
    { status: VerificationStatus; logAction: string }
  > = {
    approve: { status: "VERIFIED", logAction: "APPROVED" },
    request_fix: { status: "REQUIRES_FIX", logAction: "CORRECTION_REQUESTED" },
    reject: { status: "REJECTED", logAction: "REJECTED" },
    start_review: { status: "IN_REVIEW", logAction: "REVIEW_STARTED" },
  };

  const next = actionMap[params.action];

  const updatedProfile = await updateVerificationProfile(profile.id, {
    status: next.status,
    notes: params.comment?.trim() || null,
    reviewedAt: next.status === "IN_REVIEW" ? null : new Date(),
    reviewedById: params.actorUserId,
  });

  if (profile.subjectType === "TENANT") {
    await prisma.tenant.update({
      where: {
        id: profile.tenantId,
      },
      data: {
        isVerified: next.status === "VERIFIED",
        status: next.status === "VERIFIED" ? "ACTIVE" : "PENDING_VERIFICATION",
      },
    });
  }

  if (profile.subjectType === "FARM" && profile.farmId) {
    await prisma.farm.update({
      where: {
        id: profile.farmId,
      },
      data: {
        status: next.status === "VERIFIED" ? "ACTIVE" : "PENDING_VERIFICATION",
      },
    });
  }

  await createVerificationAudit({
    tenantId: profile.tenantId,
    profileId: profile.id,
    actorUserId: params.actorUserId,
    action: next.logAction,
    statusFrom: profile.status,
    statusTo: next.status,
    comment: params.comment?.trim() || null,
  });

  return updatedProfile;
}
