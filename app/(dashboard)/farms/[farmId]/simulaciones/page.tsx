import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { findFarmById } from "@/server/repositories/farm-repository";
import { prisma } from "@/lib/db/prisma";
import { FarmSimulationLab } from "@/components/simulations/farm-simulation-lab";

export const dynamic = "force-dynamic";

export default async function FarmSimulationsPage({ params }: { params: Promise<{ farmId: string }> }) {
  const { farmId } = await params;
  const { tenantContext } = await requireRole({
    tenant: ["TENANT_OWNER", "TENANT_ADMIN", "FARM_MANAGER", "ACCOUNTING", "OPERATOR"],
  });
  if (!tenantContext) notFound();
  const farm = await findFarmById(farmId);
  if (!farm || farm.tenantId !== tenantContext.tenant.id) notFound();
  const count = await prisma.animal.count({ where: { tenantId: tenantContext.tenant.id, farmId } });
  return <FarmSimulationLab farmId={farm.id} farmName={farm.name} currentAnimalCount={count} />;
}
