/**
 * Pure, deny-by-default tenant document authorization.
 * The caller must fetch file metadata server-side; never accept tenantId or
 * storage pathname supplied by the browser as authorization evidence.
 */
export type PrivateFileInfo = {
  tenantId: string | null;
  visibility: string;
  usage: string;
  entityType: string | null;
};

export type FileViewer = {
  platformRole: string | null;
  memberships: ReadonlyArray<{ tenantId: string; role: string }>;
};

export function canReadPrivateFile(file: PrivateFileInfo, viewer: FileViewer): boolean {
  if (!file.tenantId || file.visibility !== "PRIVATE") return false;

  const reviewer = viewer.platformRole === "ROOT" || viewer.platformRole === "PLATFORM_ADMIN";
  if (reviewer && file.usage === "VERIFICATION_DOCUMENT") return true;

  const member = viewer.memberships.find((membership) => membership.tenantId === file.tenantId);
  if (!member) return false;

  if (member.role === "TENANT_OWNER" || member.role === "TENANT_ADMIN") return true;

  if (
    member.role === "FARM_MANAGER" &&
    (file.usage === "VERIFICATION_DOCUMENT" && file.entityType === "farm_verification" ||
      file.usage === "OPERATION_SHEET")
  ) return true;

  if (member.role === "OPERATOR" && file.usage === "OPERATION_SHEET") return true;
  if (member.role === "ACCOUNTING" && file.usage === "REPORT_FILE") return true;

  return false;
}
