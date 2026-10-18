import Link from "next/link";
import {
  Building2,
  BarChart3,
  BriefcaseBusiness,
  ClipboardList,
  FileSearch,
  FileSpreadsheet,
  PawPrint,
  LayoutDashboard,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";

const items = [
  { href: "/dashboard", label: "Panel", icon: LayoutDashboard },
  { href: "/farms", label: "Fincas", icon: ShieldCheck },
  { href: "/livestock", label: "Ganado", icon: PawPrint },
  { href: "/imports", label: "Importar Excel", icon: FileSpreadsheet },
  { href: "/operations", label: "Jornadas", icon: ClipboardList },
  { href: "/verification", label: "Verificacion", icon: FileSearch },
  { href: "/admin/verification", label: "Revision", icon: Building2 },
  { href: "/dashboard", label: "Mercado", icon: BriefcaseBusiness },
  { href: "/dashboard", label: "Reportes", icon: BarChart3 },
];

type DashboardSidebarProps = {
  tenantName: string;
};

export function DashboardSidebar({ tenantName }: DashboardSidebarProps) {
  return (
    <aside className="flex w-full max-w-xs flex-col gap-8 border-r border-border/70 bg-white px-5 py-6">
      <div className="space-y-3">
        <Badge variant="secondary" className="w-fit">
          Empresa activa
        </Badge>
        <div>
          <p className="text-sm text-muted-foreground">Operacion privada</p>
          <h2 className="text-xl font-semibold">{tenantName}</h2>
        </div>
      </div>
      <nav className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
