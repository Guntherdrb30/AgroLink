import { del, put } from "@vercel/blob";

function sanitizeSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-/]+/g, "-")
    .replace(/-{2,}/g, "-");
}

export function buildBlobPath(params: {
  tenantId?: string | null;
  visibility: "PUBLIC" | "PRIVATE";
  pathSegment: string;
  fileName: string;
}) {
  const safeSegment = sanitizeSegment(params.pathSegment);
  const safeName = sanitizeSegment(params.fileName || "file");
  const root = params.tenantId
    ? `agrolynk/tenants/${params.tenantId}`
    : "agrolynk/platform";
  const visibilityRoot = params.visibility === "PUBLIC" ? "public" : "private";

  return `${root}/${visibilityRoot}/${safeSegment}/${Date.now()}-${safeName}`;
}

export async function uploadToBlob(params: {
  path: string;
  file: File;
  visibility: "PUBLIC" | "PRIVATE";
}) {
  if (params.visibility === "PRIVATE") {
    // Private Blob store must be attached to this project; SDK 2.x supports private access.
    const blob = await put(params.path, params.file, {
      access: "private",
      addRandomSuffix: true,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return {
      url: blob.url,
      pathname: blob.pathname,
      size: params.file.size,
      contentType: params.file.type || "application/octet-stream",
    };
  }
  const blob = await put(params.path, params.file, {
    access: "public",
    addRandomSuffix: true,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  return {
    url: blob.url,
    pathname: blob.pathname,
    size: params.file.size,
    contentType: params.file.type || "application/octet-stream",
  };
}

export async function deleteBlobFile(url: string) {
  await del(url, {
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
}
