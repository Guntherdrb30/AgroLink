import { prisma } from "@/lib/db/prisma";

export async function getDashboardSnapshot(tenantId: string, allowedFarmIds: string[] | null = null) {
  const farmFilter = allowedFarmIds ? { in: allowedFarmIds } : undefined;
  const [farmsCount, listingsCount, animalsCount, operationsCount] = await Promise.all([
    prisma.farm.count({ where: { tenantId, ...(farmFilter ? {id:farmFilter} : {}) } }),
    prisma.marketplaceListing.count({ where: { tenantId, ...(farmFilter ? {farmId:farmFilter} : {}) } }),
    prisma.animal.count({ where: { tenantId, inventoryStatus:"ACTIVE", ...(farmFilter ? {farmId:farmFilter} : {}) } }),
    prisma.livestockOperation.count({ where: { tenantId, ...(farmFilter ? {farmId:farmFilter} : {}) } }),
  ]);
  return {
    farmsCount: String(farmsCount),
    listingsCount: String(listingsCount),
    animalsCount: String(animalsCount),
    operationsCount: String(operationsCount),
  };
}
