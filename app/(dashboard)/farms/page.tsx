import Link from "next/link";
import { Plus, Sprout } from "lucide-react";
import { listFarmsByTenant } from "@/server/repositories/farm-repository";
import { isBusinessVerificationRequired } from "@/lib/config/business-verification";
import { requireRole } from "@/lib/auth/session";
import { FarmForm } from "@/components/forms/farm-form";
import { FarmList } from "@/components/farms/farm-list";

export const dynamic = "force-dynamic";

export default async function FarmsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const { tenantContext } = await requireRole({
    tenant: ["TENANT_OWNER", "TENANT_ADMIN", "FARM_MANAGER", "OPERATOR"],
  });
  if (!tenantContext) return null;
  const farms = await listFarmsByTenant(tenantContext.tenant.id);
  const canEdit = ["TENANT_OWNER", "TENANT_ADMIN", "FARM_MANAGER"].includes(tenantContext.membership.role);
  const verificationRequired = isBusinessVerificationRequired();
  const { new: newParam } = await searchParams;
  const showForm = canEdit && (farms.length === 0 || newParam === "1");
  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#997943]">Gestión de fincas</p>
          <h1 className="text-3xl font-bold tracking-tight text-[#203528] sm:text-4xl">Mis fincas</h1>
          <p className="max-w-xl text-sm leading-6 text-[#67766b]">
            Administra tus fincas, sus fotografías y sus datos desde cualquier dispositivo.
          </p>
        </div>
        {canEdit && !showForm ? (
          <Link href="/farms?new=1#nueva-finca" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#70572f] px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#5b4625]">
            <Plus className="size-5" aria-hidden={true} /> Nueva finca
          </Link>
        ) : null}
      </div>
      {showForm ? (
        <section id="nueva-finca" className="scroll-mt-28 rounded-[26px] border border-[#e1e8de] bg-white p-4 shadow-sm sm:p-7">
          <div className="mb-6 flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#f1ebdd] text-[#856637]">
              <Sprout className="size-6" aria-hidden={true}/>
            </span>
            <div>
              <h2 className="text-xl font-bold text-[#203528]">Registrar finca</h2>
              <p className="mt-1 text-sm leading-6 text-[#708075]">
                Completa los datos en tres pasos. Las fotografías son opcionales.
              </p>
              {farms.length > 0 ? <Link className="mt-2 inline-block text-sm font-semibold text-[#826334] underline" href="/farms">Volver a mis fincas</Link> : null}
            </div>
          </div>
          <FarmForm mode="create"/>
        </section>
      ) : null}
      <FarmList
        verificationRequired={verificationRequired}
        canEdit={canEdit}
        farms={farms.map((farm) => ({
          id: farm.id,
          name: farm.name,
          description: farm.description,
          location: farm.location,
          hectares: farm.hectares?.toString() ?? null,
          imageUrl: farm.primaryImageUrl,
          logoUrl: farm.logoUrl,
          status: farm.status,
          verificationStatus: farm.verificationProfile?.status ?? "PENDING",
        }))}
      />
    </div>
  );
}
