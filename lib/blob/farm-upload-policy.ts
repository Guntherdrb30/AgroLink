/**
 * Path and file rules for GanadIA's PRIVATE farm media.
 * This module is dependency-free so that the rules can be exercised in tests
 * and reused by the browser without exposing storage credentials.
 */
export type FarmUploadKind = "primaryImage" | "logo";

const allowedExtensions: Record<string, readonly string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
};

export function maxFarmUploadBytes(kind: FarmUploadKind): number {
  return (kind === "primaryImage" ? 10 : 5) * 1024 * 1024;
}

export function validateFarmUploadFile(
  kind: FarmUploadKind,
  filename: string,
  contentType: string,
  size: number,
): string | null {
  if (!allowedExtensions[contentType]) return "Solo se permiten imágenes JPEG, PNG o WEBP.";
  if (!filename || filename.length > 180) return "El nombre de archivo no es válido.";
  const extension = filename.toLowerCase().split(".").pop();
  if (!extension || !allowedExtensions[contentType].includes(extension)) {
    return "El formato del archivo no corresponde con su extensión.";
  }
  if (!Number.isSafeInteger(size) || size <= 0 || size > maxFarmUploadBytes(kind)) {
    return kind === "primaryImage"
      ? "La imagen principal debe pesar entre 1 byte y 10 MB."
      : "El logo debe pesar entre 1 byte y 5 MB.";
  }
  return null;
}

export type FarmUploadScope = {
  tenantId: string;
  userId: string;
  farmId: string | null;
  kind: FarmUploadKind;
};

export function farmUploadPrefix(scope: FarmUploadScope): string {
  return "agrolynk/tenants/" + scope.tenantId + "/private/farms/uploads/" +
    (scope.farmId ?? "new") + "/" + scope.userId + "/" + scope.kind + "/";
}

function safeFileName(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? "image.jpg";
  const dot = base.lastIndexOf(".");
  const extension = dot >= 0 ? base.slice(dot).toLowerCase() : "";
  const stem = (dot >= 0 ? base.slice(0, dot) : base)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "image";
  return stem + extension;
}

const filePattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[a-z0-9][a-z0-9._-]{0,90}$/;

export function createFarmUploadPath(
  scope: FarmUploadScope,
  filename: string,
  nonce: string,
): string {
  return farmUploadPrefix(scope) + nonce + "-" + safeFileName(filename);
}

export function isFarmUploadPathForActor(
  pathname: string,
  scope: FarmUploadScope,
): boolean {
  const prefix = farmUploadPrefix(scope);
  if (!pathname.startsWith(prefix)) return false;
  const tail = pathname.slice(prefix.length);
  return filePattern.test(tail) && !tail.includes("..");
}

export function farmUploadOriginalName(pathname: string): string {
  const tail = pathname.split("/").pop() ?? "";
  return tail.slice(37);
}
