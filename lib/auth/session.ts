import { cache } from "react";
import { forbidden, redirect } from "next/navigation";

import { auth } from "@/auth";
import { hasPlatformRole, hasTenantRole, type PlatformRole, type TenantRole } from "@/lib/permissions/rbac";
import { findUserAuthContextById } from "@/server/repositories/user-repository";
import { findTenantVerificationProfile } from "@/server/repositories/verification-repository";

export const getCurrentUser = cache(async () => {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  return findUserAuthContextById(session.user.id);
});

export const getCurrentTenant = cache(async () => {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const currentMembership =
    user.memberships.find((membership) => membership.tenantId === user.defaultTenantId) ??
    user.memberships.find((membership) => membership.isDefault) ??
    user.memberships[0];

  if (!currentMembership) {
    return null;
  }

  return {
    user,
    membership: currentMembership,
    tenant: currentMembership.tenant,
  };
});

export const getCurrentTenantVerification = cache(async () => {
  const tenantContext = await getCurrentTenant();

  if (!tenantContext) {
    return null;
  }

  return findTenantVerificationProfile(tenantContext.tenant.id);
});

export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

type RoleRequirement = {
  platform?: PlatformRole[];
  tenant?: TenantRole[];
};

export async function requireRole(requirement: RoleRequirement) {
  const user = await requireAuth();
  const tenantContext = await getCurrentTenant();

  if (
    requirement.platform?.length &&
    hasPlatformRole(user.platformRole ?? undefined, requirement.platform)
  ) {
    return { user, tenantContext };
  }

  if (
    requirement.tenant?.length &&
    tenantContext &&
    hasTenantRole(tenantContext.membership.role, requirement.tenant)
  ) {
    return { user, tenantContext };
  }

  forbidden();
}

export async function isCurrentTenantOperational() {
  const profile = await getCurrentTenantVerification();

  return profile?.status === "VERIFIED";
}

export async function requireOperationalTenant() {
  const [tenantContext, verificationProfile] = await Promise.all([
    getCurrentTenant(),
    getCurrentTenantVerification(),
  ]);

  if (!tenantContext) {
    redirect("/dashboard");
  }

  if (verificationProfile?.status !== "VERIFIED") {
    redirect("/verification");
  }

  return tenantContext;
}
