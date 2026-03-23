import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";

type DashboardShellProps = {
  children: React.ReactNode;
  tenantName: string;
  userName: string;
  userRole: string;
  memberships: Array<{
    tenantId: string;
    tenantName: string;
    role: string;
    isActive: boolean;
  }>;
};

export function DashboardShell({
  children,
  tenantName,
  userName,
  userRole,
  memberships,
}: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-[#f7f9fb] lg:grid lg:grid-cols-[280px_1fr]">
      <DashboardSidebar tenantName={tenantName} />
      <div className="min-w-0">
        <DashboardHeader
          userName={userName}
          userRole={userRole}
          memberships={memberships}
        />
        <main className="container px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
