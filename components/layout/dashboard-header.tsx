import Image from "next/image";
import { rolesEs } from "@/lib/i18n/labels";
import { UserButton } from "@clerk/nextjs";
import { TenantSwitcher } from "@/components/layout/tenant-switcher";

type DashboardHeaderProps = {
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

const roleLabels: Record<string, string> = {
  ROOT: "Administrador principal",
  PLATFORM_ADMIN: "Administrador de plataforma",
  TENANT_OWNER: "Propietario",
  TENANT_ADMIN: "Administrador",
  FARM_MANAGER: "Encargado de finca",
  ACCOUNTING: "Contabilidad",
  VETERINARIAN: "Veterinario",
  OPERATOR: "Operador",
  NO_ROLE: "Sin rol",
};

export function DashboardHeader({
  tenantName,
  userName,
  userRole,
  memberships,
}: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#e4e9e2] bg-white/95 px-4 py-3 backdrop-blur-xl sm:px-7 lg:px-8">
      <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#17251e] lg:hidden">
            <Image src="/logo/ganadia-icon.svg" alt="" width={36} height={36} className="size-9" priority />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#937346] sm:text-xs">
              Centro de operaciones
            </p>
            <p className="truncate text-base font-bold tracking-tight text-[#1a2b20] sm:text-lg">
              {tenantName}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          <div className="hidden max-w-52 text-right sm:block">
            <p className="truncate text-sm font-semibold text-[#28362d]">{userName}</p>
            <p className="truncate text-xs text-[#7a847b]">{rolesEs[userRole] ?? roleLabels[userRole] ?? "Sin rol"}</p>
          </div>
          <div className="flex size-11 items-center justify-center rounded-full border border-[#e3e9e2] bg-[#f7f8f5]" aria-label="Cuenta de usuario">
            <UserButton />
          </div>
        </div>
      </div>
      {memberships.length > 1 && (
        <div className="mx-auto mt-3 max-w-[1480px] border-t border-[#edf0eb] pt-3">
          <p className="mb-2 text-xs font-medium text-[#7a847b]">Cambiar empresa</p>
          <TenantSwitcher memberships={memberships} />
        </div>
      )}
    </header>
  );
}
