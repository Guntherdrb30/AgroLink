import Link from "next/link";
import {
  ArrowRight,
  Beef,
  ClipboardCheck,
  HeartPulse,
  Landmark,
  Plus,
  Sprout,
  Warehouse,
} from "lucide-react";

import { requireOperationalTenant, requireRole } from "@/lib/auth/session";
import { AnimalList } from "@/components/livestock/animal-list";
import { getLivestockIndexData } from "@/server/queries/livestock-query";

export const dynamic = "force-dynamic";

const viewerRoles = ["TENANT_OWNER", "TENANT_ADMIN", "FARM_MANAGER", "OPERATOR"] as const;
const managementRoles = ["TENANT_OWNER", "TENANT_ADMIN", "FARM_MANAGER"];

export default async function LivestockPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { tenantContext } = await requireRole({ tenant: [...viewerRoles] });
  await requireOperationalTenant();
  if (!tenantContext) return null;

  const data = await getLivestockIndexData(tenantContext.tenant.id);
  const { error, success } = await searchParams;
  const canManage = managementRoles.includes(tenantContext.membership.role);
  const hasFarms = data.farms.length > 0;
  const stats = [
    { label: "Animales", detail: "Registrados", value: data.metrics.totalAnimals, Icon: Beef },
    { label: "Fincas", detail: "Con ganado", value: data.metrics.activeFarms, Icon: Warehouse },
    { label: "Sanos", detail: "Estado sanitario", value: data.metrics.healthyAnimals, Icon: HeartPulse },
    { label: "Cría", detail: "Línea productiva", value: data.metrics.breedingAnimals, Icon: ClipboardCheck },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#96723d]">GanadIA · Operación ganadera</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#1e3226] sm:text-4xl">Mi ganado</h1>
          <p className="mt-2 max-w-lg text-sm leading-6 text-[#6b7a70]">
            Inventario, sanidad y trazabilidad animal en un solo lugar.
          </p>
        </div>
        {canManage ? (
          <Link
            href={hasFarms ? "/livestock/new" : "/farms?new=1"}
            className="inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-full bg-[#795c31] px-5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#644b27] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#96723d] sm:w-auto"
          >
            <Plus className="size-5" aria-hidden={true} />
            {hasFarms ? "Registrar animal" : "Crear primera finca"}
          </Link>
        ) : null}
      </section>

      {error ? (
        <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          No se pudo completar el registro. Revisa los campos del formulario e inténtalo de nuevo.
          {canManage && hasFarms ? <Link className="ml-1 font-bold underline" href="/livestock/new">Volver al formulario</Link> : null}
        </p>
      ) : null}
      {success === "deleted" ? (
        <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          El registro se eliminó correctamente.
        </p>
      ) : null}

      <section aria-label="Indicadores de ganado" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {stats.map(({ label, detail, value, Icon }) => (
          <article key={label} className="min-w-0 rounded-[21px] border border-[#e1e8dd] bg-white p-3.5 shadow-[0_8px_24px_rgba(16,38,22,0.045)] sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-[#f2ecdf] text-[#9b763e]">
                <Icon className="size-[19px]" aria-hidden={true} />
              </span>
            </div>
            <p className="mt-3 text-3xl font-extrabold tabular-nums tracking-tight text-[#20362a] sm:text-4xl">{value}</p>
            <h2 className="mt-1 text-sm font-bold text-[#2d4534]">{label}</h2>
            <p className="mt-0.5 text-xs leading-5 text-[#849087]">{detail}</p>
          </article>
        ))}
      </section>

      {data.animals.length > 0 ? (
        <AnimalList animals={data.animals} />
      ) : (
        <section className="rounded-[27px] border border-dashed border-[#cbd9c8] bg-white px-6 py-9 text-center shadow-sm sm:px-10 sm:py-12">
          <span className="mx-auto flex size-16 items-center justify-center rounded-[22px] bg-[#f1ecdf] text-[#92713c]">
            {hasFarms ? <Beef className="size-8" strokeWidth={1.6} aria-hidden={true} /> : <Sprout className="size-8" strokeWidth={1.6} aria-hidden={true} />}
          </span>
          <h2 className="mt-4 text-xl font-bold text-[#20362a]">
            {hasFarms ? "Todavía no hay animales registrados" : "Primero registra una finca"}
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-[#708176]">
            {hasFarms
              ? "Comienza por registrar tu primer animal. Después podrás consultar su ficha, sus registros de peso, sanidad y genealogía."
              : "Cada animal debe pertenecer a una finca. Crea tu finca para empezar a organizar el inventario ganadero."}
          </p>
          {canManage ? (
            <Link
              href={hasFarms ? "/livestock/new" : "/farms?new=1"}
              className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#795c31] px-5 text-sm font-bold text-white hover:bg-[#644b27]"
            >
              {hasFarms ? "Registrar primer animal" : "Ir a Fincas"}
              <ArrowRight className="size-4" aria-hidden={true} />
            </Link>
          ) : (
            <p className="mt-5 text-xs text-[#7c8b80]">
              Tu rol puede consultar animales, pero no registrarlos.
            </p>
          )}
        </section>
      )}

      {data.animals.length > 0 && (
        <div className="flex items-start gap-3 rounded-[20px] border border-[#e2e8dd] bg-[#f9faf7] p-4 text-sm text-[#647469]">
          <Landmark className="mt-0.5 size-5 shrink-0 text-[#96723d]" aria-hidden={true} />
          <p className="leading-6">Selecciona un animal para consultar o actualizar sus registros de peso, sanidad, reproducción e historial según tus permisos.</p>
        </div>
      )}
    </div>
  );
}
