import Link from "next/link";
import { ArrowLeft, Beef, Sprout } from "lucide-react";

import { allowedFarmIds } from "@/lib/permissions/farm-access";
import { requireOperationalTenant, requireRole } from "@/lib/auth/session";
import { AnimalForm } from "@/components/livestock/animal-form";
import { listFarmsByTenant } from "@/server/repositories/farm-repository";
import { listAnimalsForRelations } from "@/server/repositories/livestock-repository";

export const dynamic = "force-dynamic";

const editorRoles = ["TENANT_OWNER", "TENANT_ADMIN", "FARM_MANAGER"] as const;

export default async function NewAnimalPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { tenantContext } = await requireRole({ tenant: [...editorRoles] });
  await requireOperationalTenant();
  if (!tenantContext) return null;

  const [farms, animals] = await Promise.all([
    listFarmsByTenant(tenantContext.tenant.id),
    listAnimalsForRelations(tenantContext.tenant.id),
  ]);
  const granted=await allowedFarmIds(tenantContext.tenant.id,tenantContext.user.id,tenantContext.membership.role);
  const scopedFarms=farms.filter(f=>!granted||granted.includes(f.id));
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-5xl space-y-5 sm:space-y-7">
      <Link href="/livestock" className="inline-flex min-h-10 items-center gap-2 rounded-xl text-sm font-semibold text-[#795c31] hover:underline">
        <ArrowLeft className="size-4" aria-hidden={true} /> Volver a mi ganado
      </Link>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9b773f]">Gestión ganadera</p>
        <h1 className="mt-2 text-3xl font-extrabold text-[#1f3628] sm:text-4xl">Registrar animal</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#718076]">
          Completa una ficha de identidad, selecciona la finca y registra su información operativa. Las fotografías son opcionales.
        </p>
      </div>
      {scopedFarms.length === 0 ? (
        <div className="rounded-[25px] border border-[#e1e8dd] bg-white p-6 sm:p-9">
          <Sprout className="size-9 text-[#987642]" aria-hidden={true}/>
          <h2 className="mt-4 text-xl font-bold text-[#223a2a]">Necesitas una finca</h2>
          <p className="mt-2 text-sm text-[#718076]">Primero registra la finca a la que pertenecerá el animal.</p>
          <Link href="/farms?new=1" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-[#795c31] px-5 text-sm font-bold text-white hover:bg-[#644b27]">Crear finca</Link>
        </div>
      ) : (
        <section className="rounded-[27px] border border-[#e2e8dd] bg-white p-4 shadow-sm sm:p-7">
          <div className="mb-6 flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#f2ecdf] text-[#95713b]">
              <Beef className="size-6" aria-hidden={true}/>
            </span>
            <div>
              <h2 className="text-lg font-bold text-[#223a2a]">Nueva ficha animal</h2>
              <p className="mt-1 text-xs leading-5 text-[#718076]">La información se guardará en la empresa activa.</p>
            </div>
          </div>
          {error ? (
            <p role="alert" className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              Revisa los datos. El animal no se registró porque hay un campo inválido.
            </p>
          ) : null}
          <AnimalForm
            mode="create"
            farms={scopedFarms.map((farm) => ({ id: farm.id, name: farm.name }))}
            relationAnimals={animals.filter(a=>!granted||granted.includes(a.farmId)).map((animal) => ({
              id: animal.id,
              label: animal.visualIdentification
                ? `${animal.internalCode} - ${animal.visualIdentification}`
                : animal.internalCode,
            }))}
          />
        </section>
      )}
    </div>
  );
}
