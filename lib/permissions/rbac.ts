export type PlatformRole = "ROOT" | "PLATFORM_ADMIN";

export type TenantRole =
  | "TENANT_OWNER"
  | "TENANT_ADMIN"
  | "FARM_MANAGER"
  | "ACCOUNTING"
  | "OPERATOR";

export const platformRolePriority: Record<PlatformRole, number> = {
  ROOT: 100,
  PLATFORM_ADMIN: 80,
};

export const tenantRolePriority: Record<TenantRole, number> = {
  TENANT_OWNER: 100,
  TENANT_ADMIN: 80,
  FARM_MANAGER: 60,
  ACCOUNTING: 50,
  OPERATOR: 20,
};

export const tenantRolePermissions: Record<TenantRole, readonly string[]> = {
  TENANT_OWNER: ["*"],
  TENANT_ADMIN: [
    "dashboard.view",
    "tenant.manage",
    "farm.manage",
    "marketplace.manage",
    "employees.manage",
    "reports.view",
  ],
  FARM_MANAGER: [
    "dashboard.view",
    "farm.manage",
    "fieldwork.manage",
    "livestock.manage",
    "reports.view",
  ],
  ACCOUNTING: ["dashboard.view", "expenses.manage", "payroll.manage"],
  OPERATOR: ["dashboard.view", "fieldwork.manage", "livestock.manage"],
};

export function hasPlatformRole(
  actualRole: string | null | undefined,
  requiredRoles: PlatformRole[],
) {
  return Boolean(actualRole && requiredRoles.includes(actualRole as PlatformRole));
}

export function hasTenantRole(
  actualRole: string | null | undefined,
  requiredRoles: TenantRole[],
) {
  return Boolean(actualRole && requiredRoles.includes(actualRole as TenantRole));
}

export function canTenantRole(role: TenantRole, permission: string) {
  const permissions = tenantRolePermissions[role];

  return permissions.includes("*") || permissions.includes(permission);
}
