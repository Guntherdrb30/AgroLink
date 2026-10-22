import { GanadiaAssistant } from "@/components/ai/ganadia-assistant";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";

type DashboardShellProps = {
  children: React.ReactNode;
  tenantName: string;
  userName: string;
  userRole: string;
  tenantRole: string;
  platformRole: string | null;
  verificationEnabled: boolean;
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
  tenantRole,
  platformRole,
  verificationEnabled,
  memberships,
}: DashboardShellProps) {
  return (
    <div className="min-h-dvh bg-[#f5f7f3] lg:grid lg:grid-cols-[252px_minmax(0,1fr)] xl:grid-cols-[278px_minmax(0,1fr)]">
      <a
        href="#ganadia-panel-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-xl focus:bg-white focus:px-4 focus:py-3 focus:text-[#17251e]"
      >
        Saltar al contenido
      </a>
      <DashboardSidebar
        tenantName={tenantName}
        tenantRole={tenantRole}
        platformRole={platformRole}
        verificationEnabled={verificationEnabled}
      />
      <div className="min-w-0">
        <DashboardHeader
          tenantName={tenantName}
          userName={userName}
          userRole={userRole}
          memberships={memberships}
        />
        <main
          id="ganadia-panel-main"
          className="mx-auto w-full max-w-[1480px] min-w-0 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-5 sm:px-7 sm:pt-7 lg:px-8 lg:pb-12 lg:pt-8"
        >
          {children}
        </main>
      </div>
      <GanadiaAssistant financeOnly={tenantRole === "ACCOUNTING"} veterinaryOnly={tenantRole === "VETERINARIAN"} />
    </div>
  );
}
