export type FileVisibilityPolicy = "PUBLIC" | "PRIVATE";

/**
 * Upload profiles define the maximum classification. A caller must not
 * override a sensitive document profile to public, including from server code.
 */
export function resolveFileVisibility(
  profileVisibility: FileVisibilityPolicy,
  requestedVisibility?: FileVisibilityPolicy,
): FileVisibilityPolicy {
  if (requestedVisibility !== undefined && requestedVisibility !== profileVisibility) {
    throw new Error("FILE_VISIBILITY_OVERRIDE_FORBIDDEN");
  }
  return profileVisibility;
}
