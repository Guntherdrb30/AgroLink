import { prisma } from "@/lib/db/prisma";
import { getCurrentTenant } from "@/lib/auth/session";

export const globalFarmRoles = ["TENANT_OWNER", "TENANT_ADMIN"];

export async function allowedFarmIds(tenantId: string, userId: string, role: string): Promise<string[] | null> {
  if (globalFarmRoles.includes(role)) return null;
  const grants = await prisma.tenantFarmAccess.findMany({
    where: { tenantId, userId, farm: { tenantId } },
    select: { farmId: true },
  });
  return grants.map((grant) => grant.farmId);
}

export async function requireFarmPermission(farmId: string, section: "livestock" | "finance", write = false) {
  const ctx = await getCurrentTenant();
  if (!ctx) return null;
  const role = ctx.membership.role;
  if (section === "finance" && !["TENANT_OWNER", "TENANT_ADMIN", "ACCOUNTING"].includes(role)) return null;
  if (section === "livestock" && !["TENANT_OWNER", "TENANT_ADMIN", "FARM_MANAGER", "VETERINARIAN", "OPERATOR"].includes(role)) return null;
  if (write && role === "ACCOUNTING") return null;
  if (write && section === "livestock" && ["OPERATOR", "VETERINARIAN"].includes(role)) return null;
  const access = await allowedFarmIds(ctx.tenant.id, ctx.user.id, role);
  if (access && !access.includes(farmId)) return null;
  const farm = await prisma.farm.findFirst({ where: { id: farmId, tenantId: ctx.tenant.id }, select: { id: true, name: true } });
  return farm ? { ctx, farm } : null;
}
