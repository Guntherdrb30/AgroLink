import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getCurrentTenant, requireAuth } from "@/lib/auth/session";
import { isBusinessVerificationRequired } from "@/lib/config/business-verification";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [user, tenantContext] = await Promise.all([
    requireAuth(),
    getCurrentTenant(),
  ]);

  if (!tenantContext) redirect("/onboarding");

  return (
    <DashboardShell
      tenantName={tenantContext.tenant.name}
      userName={user.name ?? user.email}
      userRole={tenantContext.membership.role ?? user.platformRole ?? "NO_ROLE"}
      tenantRole={tenantContext.membership.role}
      platformRole={user.platformRole ?? null}
      verificationEnabled={isBusinessVerificationRequired()}
      memberships={user.memberships.map((membership) => ({
        tenantId: membership.tenantId,
        tenantName: membership.tenant.name,
        role: membership.role,
        isActive: membership.tenantId === tenantContext.tenant.id,
      }))}
    >
      {children}
    </DashboardShell>
  );
}
