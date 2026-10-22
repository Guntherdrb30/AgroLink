import { requireRole } from "@/lib/auth/session";
import { allowedFarmIds } from "@/lib/permissions/farm-access";
import { listFarmsByTenant } from "@/server/repositories/farm-repository";
import { LivestockImportPreview } from "@/components/imports/livestock-import-preview";
import { PageHeader } from "@/components/shared/page-header";

export const dynamic = "force-dynamic";

export default async function LivestockImportsPage() {
  const { tenantContext } = await requireRole({
    tenant: ["TENANT_OWNER", "TENANT_ADMIN", "FARM_MANAGER"],
  });
  if (!tenantContext) return null;
  const grants=await allowedFarmIds(tenantContext.tenant.id,tenantContext.user.id,tenantContext.membership.role);
  const farms = (await listFarmsByTenant(tenantContext.tenant.id)).filter(f=>!grants||grants.includes(f.id));
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Importación de datos"
        title="Revisa tu inventario ganadero desde Excel"
        description="Sube un archivo CSV o XLSX, identifica columnas y detecta errores antes de registrar animales en GanadIA."
      />
      <LivestockImportPreview importEnabled={process.env.GANADIA_ENABLE_LIVESTOCK_IMPORT === "true"} farms={farms.map(farm => ({ id: farm.id, name: farm.name }))} />
    </div>
  );
}
