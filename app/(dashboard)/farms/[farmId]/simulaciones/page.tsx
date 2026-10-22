import { notFound } from "next/navigation";
import { allowedFarmIds } from "@/lib/permissions/farm-access";
import { requireRole } from "@/lib/auth/session";
import { findFarmById } from "@/server/repositories/farm-repository";
import { prisma } from "@/lib/db/prisma";
import { FarmSimulationLab } from "@/components/simulations/farm-simulation-lab";

export const dynamic = "force-dynamic";

export default async function FarmSimulationsPage({ params }: { params: Promise<{ farmId: string }> }) {
  const { farmId } = await params;
  const { tenantContext } = await requireRole({
    tenant: ["TENANT_OWNER", "TENANT_ADMIN", "FARM_MANAGER", "OPERATOR"],
  });
  if (!tenantContext) notFound();
  const allowed=await allowedFarmIds(tenantContext.tenant.id,tenantContext.user.id,tenantContext.membership.role);if(allowed&&!allowed.includes(farmId))notFound();
  const farm = await findFarmById(farmId);
  if (!farm || farm.tenantId !== tenantContext.tenant.id) notFound();
  const count = await prisma.animal.count({ where: { tenantId: tenantContext.tenant.id, farmId } });
  return <FarmSimulationLab farmId={farm.id} farmName={farm.name} currentAnimalCount={count} />;
}
