import { listFarmsByTenant } from "@/server/repositories/farm-repository";
import { isBusinessVerificationRequired } from "@/lib/config/business-verification";
import { requireRole } from "@/lib/auth/session";
import { FarmForm } from "@/components/forms/farm-form";
import { FarmList } from "@/components/farms/farm-list";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function FarmsPage() {
  const { tenantContext } = await requireRole({
    tenant: ["TENANT_OWNER", "TENANT_ADMIN", "FARM_MANAGER", "OPERATOR"],
  });

  if (!tenantContext) {
    return null;
  }

  const farms = await listFarmsByTenant(tenantContext.tenant.id);
  const canEdit = ["TENANT_OWNER", "TENANT_ADMIN", "FARM_MANAGER"].includes(tenantContext.membership.role);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Fincas"
        title="Gestiona la base maestra de fincas de la empresa."
        description={isBusinessVerificationRequired()
          ? "Este modulo crea fincas, prepara sus activos visuales y conecta el perfil documental requerido para verificacion."
          : "Crea y administra fincas para probar todas las funcionalidades. La verificacion documental se habilitara antes del lanzamiento."}
      />
      {canEdit ? (
        <Card>
          <CardHeader>
            <CardTitle>Nueva finca</CardTitle>
          </CardHeader>
          <CardContent>
            <FarmForm mode="create" />
          </CardContent>
        </Card>
      ) : null}
      <FarmList
        farms={farms.map((farm) => ({
          id: farm.id,
          name: farm.name,
          location: farm.location,
          hectares: farm.hectares?.toString() ?? null,
          status: farm.status,
          verificationStatus: farm.verificationProfile?.status ?? "PENDING",
        }))}
      />
    </div>
  );
}
