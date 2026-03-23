import type { Prisma } from "@prisma/client";

import { buildBlobPath, deleteBlobFile, uploadToBlob } from "@/lib/blob/storage";
import { getUploadProfile, type UploadUsageKey } from "@/lib/blob/config";
import { createFileStorageRecord, deleteFileStorageRecord, findFileStorageById } from "@/server/repositories/file-storage-repository";

type StoreFileParams = {
  tenantId?: string | null;
  uploadedById?: string | null;
  file: File;
  usage: UploadUsageKey;
  visibility?: "PUBLIC" | "PRIVATE";
  label?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
};

function assertFileAllowed(file: File, usage: UploadUsageKey) {
  const profile = getUploadProfile(usage);

  if (!profile.allowedMimeTypes.includes(file.type)) {
    throw new Error("FILE_MIME_NOT_ALLOWED");
  }

  if (file.size > profile.maxSizeBytes) {
    throw new Error("FILE_TOO_LARGE");
  }
}

export async function storeFile(params: StoreFileParams) {
  assertFileAllowed(params.file, params.usage);

  const profile = getUploadProfile(params.usage);
  const visibility = params.visibility ?? profile.visibility;
  const path = buildBlobPath({
    tenantId: params.tenantId,
    visibility,
    pathSegment: profile.pathSegment,
    fileName: params.file.name,
  });

  const uploaded = await uploadToBlob({
    path,
    file: params.file,
  });

  return createFileStorageRecord({
    tenantId: params.tenantId ?? null,
    uploadedById: params.uploadedById ?? null,
    usage: profile.usage,
    category: profile.category,
    visibility,
    entityType: params.entityType ?? null,
    entityId: params.entityId ?? null,
    label: params.label ?? null,
    originalName: params.file.name,
    storageName: path.split("/").pop() ?? params.file.name,
    path: uploaded.pathname,
    url: uploaded.url,
    mimeType: uploaded.contentType,
    size: uploaded.size,
    metadata: params.metadata,
  });
}

export async function removeStoredFile(fileId: string) {
  const existingFile = await findFileStorageById(fileId);

  if (!existingFile) {
    return;
  }

  await deleteBlobFile(existingFile.url);
  await deleteFileStorageRecord(fileId);
}
