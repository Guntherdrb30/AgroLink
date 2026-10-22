import { notFound } from "next/navigation";
import { allowedFarmIds } from "@/lib/permissions/farm-access";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { GrazingAdvisor } from "@/components/geography/grazing-advisor";
import { ringFromStoredGeoJson } from "@/lib/geography/farm-geometry";

export const dynamic = "force-dynamic";

export default async function FarmGrazingAdvisorPage({
  params,
}: { params: Promise<{ farmId: string }> }) {
  const { farmId } = await params;
  const { tenantContext } = await requireRole({
    tenant: ["TENANT_OWNER","TENANT_ADMIN","FARM_MANAGER","OPERATOR"],
  });
  if (!tenantContext) notFound();
  const grants=await allowedFarmIds(tenantContext.tenant.id,tenantContext.user.id,tenantContext.membership.role);
  if(grants&&!grants.includes(farmId))notFound();
  const farm = await prisma.farm.findFirst({
    where: { id: farmId, tenantId: tenantContext.tenant.id },
    select: { id: true, name: true, hectares: true, latitude: true, longitude: true },
  });
  if (!farm) notFound();
  const [geoAreas, animalsRegistered] = await Promise.all([
    prisma.farmGeoArea.findMany({
      where: { tenantId: tenantContext.tenant.id, farmId, kind: "FOUNDATION" },
      select: { id: true, name: true, areaHectares: true, coordinates: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.animal.count({ where: { tenantId: tenantContext.tenant.id, farmId } }),
  ]);
  const geometries = geoAreas.flatMap(a => {
    const ring = ringFromStoredGeoJson(a.coordinates);
    return ring ? [{ id: a.id, name: a.name, hectares: Number(a.areaHectares), ring }] : [];
  });
  const canSave = ["TENANT_OWNER","TENANT_ADMIN","FARM_MANAGER"].includes(tenantContext.membership.role);
  return <GrazingAdvisor
    farmId={farm.id} farmName={farm.name}
    farmHectares={farm.hectares === null ? null : Number(farm.hectares)}
    latitude={farm.latitude === null ? null : Number(farm.latitude)}
    longitude={farm.longitude === null ? null : Number(farm.longitude)}
    animalsRegistered={animalsRegistered} geometries={geometries} canSave={canSave}
  />;
}
