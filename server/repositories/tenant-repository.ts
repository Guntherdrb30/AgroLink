import { prisma } from "@/lib/db/prisma";

export function findTenantBySlug(slug: string) {
  return prisma.tenant.findUnique({
    where: { slug },
  });
}

export function createTenant(name: string, slug: string) {
  return prisma.tenant.create({
    data: {
      name,
      slug,
    },
  });
}
