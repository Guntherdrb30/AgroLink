import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { findFarmById } from "@/server/repositories/farm-repository";
import { FarmGeoExplorer } from "@/components/geography/farm-geo-explorer";

export const dynamic = "force-dynamic";

export default async function FarmGeographyPage({ params }: { params: Promise<{ farmId: string }> }) {
  const { farmId } = await params;
  const { tenantContext } = await requireRole({
    tenant: ["TENANT_OWNER", "TENANT_ADMIN", "FARM_MANAGER", "OPERATOR"],
  });
  if (!tenantContext) notFound();
  const farm = await findFarmById(farmId);
  if (!farm || farm.tenantId !== tenantContext.tenant.id) notFound();
  const canEdit = ["TENANT_OWNER", "TENANT_ADMIN", "FARM_MANAGER"].includes(tenantContext.membership.role);
  return <FarmGeoExplorer
    farmId={farm.id}
    farmName={farm.name}
    latitude={farm.latitude === null ? null : Number(farm.latitude)}
    longitude={farm.longitude === null ? null : Number(farm.longitude)}
    hectares={farm.hectares === null ? null : Number(farm.hectares)}
    canEdit={canEdit}
  />;
}
