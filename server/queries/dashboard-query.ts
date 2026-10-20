import { prisma } from "@/lib/db/prisma";

export async function getDashboardSnapshot(tenantId: string) {
  const [farmsCount, listingsCount, animalsCount, operationsCount] = await Promise.all([
    prisma.farm.count({ where: { tenantId } }),
    prisma.marketplaceListing.count({ where: { tenantId } }),
    prisma.animal.count({ where: { tenantId } }),
    prisma.livestockOperation.count({ where: { tenantId } }),
  ]);
  return {
    farmsCount: String(farmsCount),
    listingsCount: String(listingsCount),
    animalsCount: String(animalsCount),
    operationsCount: String(operationsCount),
  };
}
