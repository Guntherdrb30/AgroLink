import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getCurrentTenant, requireAuth } from "@/lib/auth/session";

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
      tenantName={tenantContext?.tenant.name ?? "Empresa pendiente"}
      userName={user.name ?? user.email}
      userRole={tenantContext?.membership.role ?? user.platformRole ?? "NO_ROLE"}
      memberships={user.memberships.map((membership) => ({
        tenantId: membership.tenantId,
        tenantName: membership.tenant.name,
        role: membership.role,
        isActive: membership.tenantId === tenantContext?.tenant.id,
      }))}
    >
      {children}
    </DashboardShell>
  );
}
