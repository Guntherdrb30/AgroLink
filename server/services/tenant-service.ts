import { findMembershipByUserAndTenant, listMembershipsByUser, setMembershipDefault } from "@/server/repositories/tenant-membership-repository";
import { updateUserDefaultTenant } from "@/server/repositories/user-repository";

export async function getCurrentTenantContext(userId: string, tenantId: string) {
  const membership = await findMembershipByUserAndTenant(userId, tenantId);

  if (!membership) {
    return null;
  }

  return {
    tenant: membership.tenant,
    membership,
  };
}

export async function listUserTenants(userId: string) {
  return listMembershipsByUser(userId);
}

export async function switchActiveTenant(userId: string, tenantId: string) {
  const membership = await findMembershipByUserAndTenant(userId, tenantId);

  if (!membership) {
    throw new Error("TENANT_ACCESS_DENIED");
  }

  await Promise.all([
    updateUserDefaultTenant(userId, tenantId),
    setMembershipDefault(userId, tenantId),
  ]);

  return membership;
}
