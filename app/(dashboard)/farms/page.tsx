import { listFarmsByTenant } from "@/server/repositories/farm-repository";
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

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Fincas"
        title="Gestiona la base maestra de fincas del tenant."
        description="Este modulo crea fincas, prepara sus activos visuales y conecta el perfil documental requerido para verificacion."
      />
      <Card>
        <CardHeader>
          <CardTitle>Nueva finca</CardTitle>
        </CardHeader>
        <CardContent>
          <FarmForm mode="create" />
        </CardContent>
      </Card>
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
