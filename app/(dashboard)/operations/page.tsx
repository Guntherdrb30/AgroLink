import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCheck, ClipboardList, FileSpreadsheet, Plus, Sprout } from "lucide-react";
import { requireOperationalTenant, requireRole } from "@/lib/auth/session";
import { OperationList } from "@/components/operations/operation-list";
import { allowedFarmIds } from "@/lib/permissions/farm-access";
import { getLivestockOperationsIndexData } from "@/server/queries/livestock-operation-query";

export const dynamic = "force-dynamic";
const viewerRoles = ["TENANT_OWNER", "TENANT_ADMIN", "FARM_MANAGER", "OPERATOR"] as const;
const managementRoles = ["TENANT_OWNER", "TENANT_ADMIN"];
export default async function OperationsPage() {
  const { tenantContext } = await requireRole({ tenant: [...viewerRoles] });
  await requireOperationalTenant();
  if (!tenantContext) return null;
  const canManage = managementRoles.includes(tenantContext.membership.role);
  const grants=await allowedFarmIds(tenantContext.tenant.id,tenantContext.user.id,tenantContext.membership.role);
  const data = await getLivestockOperationsIndexData(tenantContext.tenant.id,grants);
  const cards = [
    { label: "Programadas", value: data.metrics.planned, Icon: CalendarDays },
    { label: "Por revisar", value: data.metrics.pendingApplication, Icon: ClipboardList },
    { label: "Finalizadas", value: data.metrics.completed, Icon: CheckCheck },
    { label: "Planillas", value: data.metrics.totalSheets, Icon: FileSpreadsheet },
  ];
  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#997943]">GanadIA · Operaciones</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#203629] sm:text-4xl">Jornadas de campo</h1>
          <p className="mt-2 max-w-lg text-sm leading-6 text-[#69776c]">Planifica trabajos, captura resultados y conserva la trazabilidad de tu finca.</p>
        </div>
        {canManage && (
          <Link href={data.farms.length ? "/operations/new" : "/farms?new=1"}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#795c31] px-5 text-sm font-bold text-white hover:bg-[#654c29] sm:w-auto">
            <Plus className="size-5" aria-hidden={true} />
            {data.farms.length ? "Nueva jornada" : "Crear primera finca"}
          </Link>
        )}
      </section>
      <section aria-label="Indicadores de jornadas" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {cards.map(({ label, value, Icon }) => (
          <article key={label} className="rounded-[21px] border border-[#e1e8dd] bg-white p-3.5 shadow-sm sm:p-5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#f2ecdf] text-[#9b763e]"><Icon className="size-5" aria-hidden={true}/></span>
            <p className="mt-3 text-3xl font-extrabold tabular-nums tracking-tight text-[#20362a]">{value}</p>
            <p className="mt-1 text-sm font-semibold text-[#2d4534]">{label}</p>
          </article>
        ))}
      </section>
      {data.operations.length ? (
        <OperationList operations={data.operations} />
      ) : (
        <section className="rounded-[25px] border border-dashed border-[#ccd9ca] bg-white px-6 py-10 text-center shadow-sm">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#f2ecdf] text-[#95703a]"><ClipboardList className="size-7" aria-hidden={true}/></div>
          <h2 className="mt-4 text-lg font-bold text-[#20362a]">{data.farms.length ? "Todavía no hay jornadas" : "Primero registra una finca"}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-[#728075]">{data.farms.length ? "Organiza tu primera jornada de pesaje, sanidad o control ganadero." : "Necesitas una finca para planificar las jornadas de campo."}</p>
          {canManage && <Link href={data.farms.length ? "/operations/new" : "/farms?new=1"} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#795c31] px-5 text-sm font-bold text-white hover:bg-[#654c29]">{data.farms.length ? "Crear jornada" : "Ir a Fincas"}<ArrowRight className="size-4"/></Link>}
        </section>
      )}
      <p className="text-xs leading-6 text-[#79867c]">Las planillas permiten anotar resultados sin conexión. La sincronización offline desde la PWA todavía está en desarrollo.</p>
    </div>
  );
}
