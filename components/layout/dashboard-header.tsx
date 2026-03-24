import { LogOut } from "lucide-react";

import { signOutAction } from "@/server/actions/sign-out";
import { TenantSwitcher } from "@/components/layout/tenant-switcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type DashboardHeaderProps = {
  userName: string;
  userRole: string;
  memberships: Array<{
    tenantId: string;
    tenantName: string;
    role: string;
    isActive: boolean;
  }>;
};

export function DashboardHeader({
  userName,
  userRole,
  memberships,
}: DashboardHeaderProps) {
  const roleLabels: Record<string, string> = {
    ROOT: "Raiz",
    PLATFORM_ADMIN: "Administrador de plataforma",
    TENANT_OWNER: "Propietario",
    TENANT_ADMIN: "Administrador",
    FARM_MANAGER: "Encargado de finca",
    ACCOUNTING: "Contabilidad",
    OPERATOR: "Operador",
    NO_ROLE: "Sin rol",
  };

  return (
    <header className="flex flex-col gap-4 border-b border-border/70 bg-white px-6 py-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Sesion activa</p>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">{userName}</h1>
            <Badge variant="outline">{roleLabels[userRole] ?? userRole}</Badge>
          </div>
        </div>
        <form action={signOutAction}>
          <Button type="submit" variant="outline" size="sm">
            <LogOut className="size-4" />
            Cerrar sesion
          </Button>
        </form>
      </div>
      <TenantSwitcher memberships={memberships} />
    </header>
  );
}
