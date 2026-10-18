import { prisma } from "@/lib/db/prisma";
import type { UploadUsageKey } from "@/lib/blob/config";
import type { FarmInput } from "@/lib/validators/farm";
import { createFarm, deleteFarm, findFarmById, updateFarm } from "@/server/repositories/farm-repository";
import { createVerificationAudit, ensureVerificationProfile } from "@/server/repositories/verification-repository";
import { removeStoredFile, storeFile } from "@/server/services/file-storage-service";

function normalizeDecimal(value?: string) {
  if (!value?.trim()) {
    return null;
  }

  return value.replace(",", ".");
}

async function storeFarmAsset(params: {
  tenantId: string;
  actorUserId: string;
  file: File;
  usage: UploadUsageKey;
  entityId?: string;
  label: string;
}) {
  return storeFile({
    tenantId: params.tenantId,
    uploadedById: params.actorUserId,
    file: params.file,
    usage: params.usage,
    label: params.label,
    entityType: "farm",
    entityId: params.entityId,
  });
}

export async function createFarmForTenant(
  tenantId: string,
  actorUserId: string,
  input: FarmInput,
  assets: {
    primaryImage?: File | null;
    logo?: File | null;
  },
) {
  // A previous request may have saved the farm before a media upload failed.
  const existing = await prisma.farm.findFirst({ where: { tenantId, name: { equals: input.name, mode: "insensitive" } }, orderBy: { createdAt: "desc" } });
  if (existing) return existing;
  const farm = await createFarm({
    tenant: {
      connect: {
        id: tenantId,
      },
    },
    name: input.name,
    description: input.description?.trim() || null,
    location: input.location?.trim() || null,
    latitude: normalizeDecimal(input.latitude),
    longitude: normalizeDecimal(input.longitude),
    hectares: normalizeDecimal(input.hectares),
    status: "PENDING_VERIFICATION",
  });

  const [primaryImageFile, logoFile] = await Promise.all([
    assets.primaryImage && assets.primaryImage.size > 0
      ? storeFarmAsset({
          tenantId,
          actorUserId,
          file: assets.primaryImage,
          usage: "farm_primary_image",
          entityId: farm.id,
          label: "Farm primary image",
        })
      : null,
    assets.logo && assets.logo.size > 0
      ? storeFarmAsset({
          tenantId,
          actorUserId,
          file: assets.logo,
          usage: "farm_logo",
          entityId: farm.id,
          label: "Farm logo",
        })
      : null,
  ]);

  const updatedFarm = await updateFarm(farm.id, {
    primaryImageUrl: primaryImageFile ? `/api/farm-media/${primaryImageFile.id}` : null,
    primaryImageFileId: primaryImageFile?.id ?? null,
    logoUrl: logoFile ? `/api/farm-media/${logoFile.id}` : null,
    logoFileId: logoFile?.id ?? null,
  });

  const profile = await ensureVerificationProfile(tenantId, "FARM", farm.id, farm.id);

  await createVerificationAudit({
    tenantId,
    profileId: profile.id,
    actorUserId,
    action: "FARM_CREATED",
    statusTo: profile.status,
    comment: "Farm created and awaiting documentation.",
  });

  return updatedFarm;
}

export async function updateTenantFarm(
  tenantId: string,
  farmId: string,
  input: FarmInput,
  assets: {
    primaryImage?: File | null;
    logo?: File | null;
  },
  actorUserId?: string,
) {
  const currentFarm = await findFarmById(farmId);

  if (!currentFarm || currentFarm.tenantId !== tenantId) {
    throw new Error("FARM_NOT_FOUND");
  }

  let primaryImageUrl = currentFarm.primaryImageUrl;
  let primaryImageFileId = currentFarm.primaryImageFileId;
  let logoUrl = currentFarm.logoUrl;
  let logoFileId = currentFarm.logoFileId;

  if (assets.primaryImage && assets.primaryImage.size > 0 && actorUserId) {
    const upload = await storeFarmAsset({
      tenantId,
      actorUserId,
      file: assets.primaryImage,
      usage: "farm_primary_image",
      entityId: farmId,
      label: "Farm primary image",
    });

    if (currentFarm.primaryImageFileId) {
      await removeStoredFile(currentFarm.primaryImageFileId);
    }

    primaryImageUrl = `/api/farm-media/${upload.id}`;
    primaryImageFileId = upload.id;
  }

  if (assets.logo && assets.logo.size > 0 && actorUserId) {
    const upload = await storeFarmAsset({
      tenantId,
      actorUserId,
      file: assets.logo,
      usage: "farm_logo",
      entityId: farmId,
      label: "Farm logo",
    });

    if (currentFarm.logoFileId) {
      await removeStoredFile(currentFarm.logoFileId);
    }

    logoUrl = `/api/farm-media/${upload.id}`;
    logoFileId = upload.id;
  }

  return updateFarm(farmId, {
    name: input.name,
    description: input.description?.trim() || null,
    location: input.location?.trim() || null,
    latitude: normalizeDecimal(input.latitude),
    longitude: normalizeDecimal(input.longitude),
    hectares: normalizeDecimal(input.hectares),
    primaryImageUrl,
    primaryImageFileId,
    logoUrl,
    logoFileId,
  });
}

export async function deleteTenantFarm(tenantId: string, farmId: string) {
  const currentFarm = await findFarmById(farmId);

  if (!currentFarm || currentFarm.tenantId !== tenantId) {
    throw new Error("FARM_NOT_FOUND");
  }

  if (currentFarm.primaryImageFileId) {
    await removeStoredFile(currentFarm.primaryImageFileId);
  }

  if (currentFarm.logoFileId) {
    await removeStoredFile(currentFarm.logoFileId);
  }

  return deleteFarm(farmId);
}
