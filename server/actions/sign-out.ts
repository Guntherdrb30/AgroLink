"use server";

import { signOut } from "@/auth";
import { getCurrentTenant, getCurrentUser } from "@/lib/auth/session";
import { recordAccessAudit } from "@/server/services/access-audit-service";

export async function signOutAction() {
  const [user, tenantContext] = await Promise.all([
    getCurrentUser(),
    getCurrentTenant(),
  ]);

  if (user) {
    await recordAccessAudit({
      action: "LOGOUT",
      userId: user.id,
      tenantId: tenantContext?.tenant.id ?? user.defaultTenantId,
      email: user.email,
      provider: "session",
    });
  }

  await signOut({
    redirectTo: "/login",
  });
}
