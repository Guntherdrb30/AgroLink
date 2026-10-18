import { head } from "@vercel/blob";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  farmUploadOriginalName,
  isFarmUploadPathForActor,
  validateFarmUploadFile,
  type FarmUploadKind,
} from "@/lib/blob/farm-upload-policy";
import type { FarmInput } from "@/lib/validators/farm";
import { findFarmById, deleteFarm } from "@/server/repositories/farm-repository";
import { createVerificationAudit } from "@/server/repositories/verification-repository";
import { removeStoredFile } from "@/server/services/file-storage-service";

export type FarmUploadPaths = {
  primaryImagePath?: string | null;
  logoPath?: string | null;
};

type PreparedAsset = {
  pathname: string;
  url: string;
  size: number;
  contentType: string;
  originalName: string;
};

function normalizeDecimal(value?: string) {
  return value?.trim() ? value.replace(",", ".") : null;
}

async function inspectUploadedAsset(
  tenantId: string,
  actorUserId: string,
  farmId: string | null,
  kind: FarmUploadKind,
  pathname: string | null | undefined,
): Promise<PreparedAsset | null> {
  if (!pathname) return null;
  const scope = { tenantId, userId: actorUserId, farmId, kind };
  if (!isFarmUploadPathForActor(pathname, scope)) throw new Error("FARM_UPLOAD_SCOPE_DENIED");

  let blob;
  try {
    blob = await head(pathname, { token: process.env.BLOB_READ_WRITE_TOKEN });
  } catch {
    throw new Error("FARM_UPLOAD_NOT_FOUND");
  }
  if (!blob || blob.pathname !== pathname || !blob.url.includes(".private.blob.vercel-storage.com/")) {
    throw new Error("FARM_UPLOAD_INVALID");
  }
  const originalName = farmUploadOriginalName(pathname);
  if (validateFarmUploadFile(kind, originalName, blob.contentType, blob.size)) {
    throw new Error("FARM_UPLOAD_INVALID");
  }
  return {
    pathname, url: blob.url, size: blob.size,
    contentType: blob.contentType, originalName,
  };
}

async function insertFarmAsset(
  tx: Prisma.TransactionClient,
  tenantId: string,
  actorUserId: string,
  farmId: string,
  kind: FarmUploadKind,
  asset: PreparedAsset | null,
) {
  if (!asset) return null;
  return tx.fileStorage.create({
    data: {
      tenantId,
      uploadedById: actorUserId,
      entityType: "farm",
      entityId: farmId,
      usage: kind === "primaryImage" ? "FARM_PRIMARY_IMAGE" : "FARM_LOGO",
      category: "IMAGE",
      visibility: "PRIVATE",
      label: kind === "primaryImage" ? "Farm primary image" : "Farm logo",
      originalName: asset.originalName,
      storageName: asset.pathname.split("/").pop() ?? asset.originalName,
      path: asset.pathname,
      url: asset.url,
      mimeType: asset.contentType,
      size: asset.size,
    },
    select: { id: true },
  });
}

export async function createFarmForTenant(
  tenantId: string,
  actorUserId: string,
  input: FarmInput,
  assets: FarmUploadPaths,
) {
  // Preserve the existing idempotent create behavior if a previous request succeeded.
  const existing = await prisma.farm.findFirst({
    where: { tenantId, name: { equals: input.name, mode: "insensitive" } },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;

  const [primaryImage, logo] = await Promise.all([
    inspectUploadedAsset(tenantId, actorUserId, null, "primaryImage", assets.primaryImagePath),
    inspectUploadedAsset(tenantId, actorUserId, null, "logo", assets.logoPath),
  ]);

  const saved = await prisma.$transaction(async (tx) => {
    const farm = await tx.farm.create({
      data: {
        tenantId,
        name: input.name,
        description: input.description?.trim() || null,
        location: input.location?.trim() || null,
        latitude: normalizeDecimal(input.latitude),
        longitude: normalizeDecimal(input.longitude),
        hectares: normalizeDecimal(input.hectares),
        status: "PENDING_VERIFICATION",
      },
    });
    const newPrimary = await insertFarmAsset(tx, tenantId, actorUserId, farm.id, "primaryImage", primaryImage);
    const newLogo = await insertFarmAsset(tx, tenantId, actorUserId, farm.id, "logo", logo);
    const updated = await tx.farm.update({
      where: { id: farm.id },
      data: {
        primaryImageFileId: newPrimary?.id ?? null,
        primaryImageUrl: newPrimary ? "/api/farm-media/" + newPrimary.id : null,
        logoFileId: newLogo?.id ?? null,
        logoUrl: newLogo ? "/api/farm-media/" + newLogo.id : null,
      },
    });
    const profile = await tx.verificationProfile.create({
      data: {
        tenantId,
        farmId: farm.id,
        subjectType: "FARM",
        subjectId: farm.id,
        status: "PENDING",
      },
    });
    return { farm: updated, profile };
  });

  await createVerificationAudit({
    tenantId,
    profileId: saved.profile.id,
    actorUserId,
    action: "FARM_CREATED",
    statusTo: saved.profile.status,
    comment: "Farm created; documentary verification is retained for final launch.",
  });
  return saved.farm;
}

export async function updateTenantFarm(
  tenantId: string,
  farmId: string,
  input: FarmInput,
  assets: FarmUploadPaths,
  actorUserId: string,
) {
  const current = await prisma.farm.findFirst({ where: { id: farmId, tenantId }, select: { id: true } });
  if (!current) throw new Error("FARM_NOT_FOUND");

  const [primaryImage, logo] = await Promise.all([
    inspectUploadedAsset(tenantId, actorUserId, farmId, "primaryImage", assets.primaryImagePath),
    inspectUploadedAsset(tenantId, actorUserId, farmId, "logo", assets.logoPath),
  ]);
  return prisma.$transaction(async (tx) => {
    // Recheck ownership inside the write transaction.
    const farm = await tx.farm.findFirst({ where: { id: farmId, tenantId } });
    if (!farm) throw new Error("FARM_NOT_FOUND");
    const newPrimary = await insertFarmAsset(tx, tenantId, actorUserId, farmId, "primaryImage", primaryImage);
    const newLogo = await insertFarmAsset(tx, tenantId, actorUserId, farmId, "logo", logo);

    // Never delete old files during a replace: a DB failure must not lose images.
    // Historical files remain private and no longer resolve through farm-media.
    return tx.farm.update({
      where: { id: farmId },
      data: {
        name: input.name,
        description: input.description?.trim() || null,
        location: input.location?.trim() || null,
        latitude: normalizeDecimal(input.latitude),
        longitude: normalizeDecimal(input.longitude),
        hectares: normalizeDecimal(input.hectares),
        primaryImageFileId: newPrimary?.id ?? farm.primaryImageFileId,
        primaryImageUrl: newPrimary ? "/api/farm-media/" + newPrimary.id : farm.primaryImageUrl,
        logoFileId: newLogo?.id ?? farm.logoFileId,
        logoUrl: newLogo ? "/api/farm-media/" + newLogo.id : farm.logoUrl,
      },
    });
  });
}

export async function deleteTenantFarm(tenantId: string, farmId: string) {
  const currentFarm = await findFarmById(farmId);
  if (!currentFarm || currentFarm.tenantId !== tenantId) throw new Error("FARM_NOT_FOUND");
  if (currentFarm.primaryImageFileId) await removeStoredFile(currentFarm.primaryImageFileId);
  if (currentFarm.logoFileId) await removeStoredFile(currentFarm.logoFileId);
  return deleteFarm(farmId);
}
