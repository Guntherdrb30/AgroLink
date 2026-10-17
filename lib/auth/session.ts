import { cache } from "react";
import { forbidden, redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";

import { prisma } from "@/lib/db/prisma";
import { assertIsolatedPreviewDatabase } from "@/lib/security/preview-db-isolation";
import { hasPlatformRole, hasTenantRole, type PlatformRole, type TenantRole } from "@/lib/permissions/rbac";
import { findUserAuthContextById } from "@/server/repositories/user-repository";
import { findTenantVerificationProfile } from "@/server/repositories/verification-repository";

/**
 * Clerk owns identity. Prisma owns AgroLynk users, memberships and permissions.
 * Never attach an existing local account just because its email matches Clerk.
 */
export const getCurrentUser = cache(async () => {
  const { userId } = await auth();
  if (!userId) return null;
  assertIsolatedPreviewDatabase();

  const linkedUser = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    select: { id: true },
  });
  if (linkedUser) return findUserAuthContextById(linkedUser.id);

  const identity = await currentUser();
  if (!identity || identity.id !== userId) return null;
  const emailRecord = identity.emailAddresses.find(
    (address) =>
      address.id === identity.primaryEmailAddressId &&
      address.verification?.status === "verified",
  );
  if (!emailRecord) return null;

  const email = emailRecord.emailAddress.trim().toLowerCase();
  // No automated identity takeover via equal email. Legacy accounts require an explicit admin migration.
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) throw new Error("LEGACY_ACCOUNT_REQUIRES_MANUAL_LINK");

  let id: string;
  try {
    const newUser = await prisma.user.upsert({
      where: { clerkUserId: userId },
      update: {},
      create: {
        clerkUserId: userId,
        name: identity.fullName || [identity.firstName, identity.lastName].filter(Boolean).join(" ") || null,
        email,
        emailVerified: new Date(),
        image: identity.imageUrl,
      },
      select: { id: true },
    });
    id = newUser.id;
  } catch (error) {
    // Concurrent requests may race on the initial Clerk -> Prisma provisioning.
    const raced = await prisma.user.findUnique({ where: { clerkUserId: userId }, select: { id: true } });
    if (!raced) throw error;
    id = raced.id;
  }
  return findUserAuthContextById(id);
});

export const getCurrentTenant = cache(async () => {
  const user = await getCurrentUser();
  if (!user) return null;
  const membership =
    user.memberships.find((item) => item.tenantId === user.defaultTenantId) ??
    user.memberships.find((item) => item.isDefault) ??
    user.memberships[0];
  if (!membership) return null;
  return { user, membership, tenant: membership.tenant };
});

export const getCurrentTenantVerification = cache(async () => {
  const context = await getCurrentTenant();
  return context ? findTenantVerificationProfile(context.tenant.id) : null;
});

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

type RoleRequirement = { platform?: PlatformRole[]; tenant?: TenantRole[] };

export async function requireRole(requirement: RoleRequirement) {
  const user = await requireAuth();
  const tenantContext = await getCurrentTenant();
  if (requirement.platform?.length && hasPlatformRole(user.platformRole ?? undefined, requirement.platform)) {
    return { user, tenantContext };
  }
  if (requirement.tenant?.length && tenantContext &&
    hasTenantRole(tenantContext.membership.role, requirement.tenant)) {
    return { user, tenantContext };
  }
  forbidden();
}

export async function isCurrentTenantOperational() {
  const profile = await getCurrentTenantVerification();
  return profile?.status === "VERIFIED";
}

export async function requireOperationalTenant() {
  const context = await getCurrentTenant();
  if (!context) redirect("/onboarding");
  const profile = await getCurrentTenantVerification();
  if (profile?.status !== "VERIFIED") redirect("/verification");
  return context;
}
