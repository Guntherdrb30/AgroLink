import Link from "next/link";
import { ArrowLeft, ClipboardList, Sprout } from "lucide-react";
import { requireRole, requireOperationalTenant } from "@/lib/auth/session";
import { allowedFarmIds } from "@/lib/permissions/farm-access";
import { getLivestockOperationsIndexData } from "@/server/queries/livestock-operation-query";
import { OperationForm } from "@/components/operations/operation-form";
export const dynamic = "force-dynamic";
export default async function NewOperationPage() {
  const { tenantContext } = await requireRole({ tenant: ["TENANT_OWNER", "TENANT_ADMIN", "FARM_MANAGER", "OPERATOR"] });
  await requireOperationalTenant();
  if (!tenantContext) return null;
  const grants=await allowedFarmIds(tenantContext.tenant.id,tenantContext.user.id,tenantContext.membership.role);
  const data = await getLivestockOperationsIndexData(tenantContext.tenant.id,grants);
  return <div className="mx-auto max-w-5xl space-y-5">
    <Link href="/operations" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#795c31]"><ArrowLeft className="size-4"/> Volver a Jornadas</Link>
    <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#997943]">Planificación</p><h1 className="mt-2 text-3xl font-extrabold text-[#203629]">Nueva jornada</h1><p className="mt-2 text-sm leading-6 text-[#718076]">Selecciona tu finca, los trabajos y los animales que participarán.</p></div>
    {data.farms.length ? <section className="rounded-[26px] border border-[#e1e8dd] bg-white p-4 shadow-sm sm:p-7"><div className="mb-6 flex items-center gap-3 text-[#273d2d]"><ClipboardList className="size-6 text-[#95703a]"/><h2 className="text-xl font-bold">Datos de la jornada</h2></div><OperationForm farms={data.farms} animals={data.animals}/></section> :
    <div className="rounded-3xl border bg-white p-7"><Sprout className="size-9 text-[#997943]"/><h2 className="mt-3 text-lg font-bold">Necesitas una finca</h2><p className="mt-2 text-sm text-[#718076]">Crea primero una finca para asignarle jornadas.</p><Link href="/farms?new=1" className="mt-4 inline-flex rounded-full bg-[#795c31] px-5 py-3 text-sm font-bold text-white">Crear finca</Link></div>}
  </div>;
}
