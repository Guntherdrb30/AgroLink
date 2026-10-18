import { isBusinessVerificationRequired } from "@/lib/config/business-verification";
import { redirect } from "next/navigation";
import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { VerificationGate } from "@/components/dashboard/verification-gate";
import { PageHeader } from "@/components/shared/page-header";
import { getCurrentTenant, getCurrentTenantVerification } from "@/lib/auth/session";
import { getDashboardSnapshot } from "@/server/queries/dashboard-query";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const context = await getCurrentTenant();
  if (!context) redirect("/onboarding");
  const tenantId = context.tenant.id;
  const [snapshot, verificationProfile] = await Promise.all([
    tenantId ? getDashboardSnapshot(tenantId) : null,
    getCurrentTenantVerification(),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Panel"
        title="Un panel limpio, listo para crecer por modulos."
        description="Esta vista base ya separa metricas, contexto de la empresa y proximos bloques funcionales del producto."
      />
      {isBusinessVerificationRequired() && verificationProfile ? (
        <VerificationGate status={verificationProfile.status} />
      ) : null}
      <DashboardOverview
        items={[
          {
            label: "Fincas",
            value: snapshot?.farmsCount ?? "0",
            hint: "Base maestra de la empresa",
          },
          {
            label: "Publicaciones",
            value: snapshot?.listingsCount ?? "0",
            hint: "Mercado por conectar",
          },
          {
            label: "Animales",
            value: snapshot?.animalsCount ?? "0",
            hint: "Nucleo ganadero activo",
          },
          {
            label: "Trabajos",
            value: snapshot?.fieldWorkCount ?? "0",
            hint: "Operacion de llano",
          },
        ]}
      />
      <DashboardEmptyState />
    </div>
  );
}
