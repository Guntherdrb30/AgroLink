/**
 * Fail closed for Vercel Preview until its database is explicitly isolated.
 * Do not mark an environment isolated until verifying that it uses a separate
 * Neon branch and that all write connection strings point to that branch.
 */
export function isUnsafePreviewDatabase() {
  return (
    process.env.VERCEL_ENV === "preview" &&
    process.env.AGROLYNK_PREVIEW_DB_ISOLATED !== "true"
  );
}

export function assertIsolatedPreviewDatabase() {
  if (isUnsafePreviewDatabase()) {
    throw new Error("PREVIEW_DATABASE_NOT_ISOLATED");
  }
}
