import { requireOperationalTenant, requireRole } from "@/lib/auth/session";
import { AnimalList } from "@/components/livestock/animal-list";
import { AnimalForm } from "@/components/livestock/animal-form";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLivestockIndexData } from "@/server/queries/livestock-query";

export const dynamic = "force-dynamic";

const viewerRoles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "FARM_MANAGER",
  "ACCOUNTING",
  "OPERATOR",
] as const;

const managementRoles = ["TENANT_OWNER", "TENANT_ADMIN", "FARM_MANAGER", "OPERATOR"];

export default async function LivestockPage() {
  const { tenantContext } = await requireRole({
    tenant: [...viewerRoles],
  });
  await requireOperationalTenant();

  if (!tenantContext) {
    return null;
  }

  const canManage = managementRoles.includes(tenantContext.membership.role);
  const data = await getLivestockIndexData(tenantContext.tenant.id);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Ganado"
        title="Gestion maestra del hato con trazabilidad por animal."
        description="Cada ficha concentra identidad, genealogia, peso, sanidad y eventos operativos para sostener una operacion ganadera ordenada."
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-4xl">{data.metrics.totalAnimals}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Animales registrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-4xl">{data.metrics.activeFarms}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Fincas con inventario</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-4xl">{data.metrics.healthyAnimals}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Animales en estado sano</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-4xl">{data.metrics.breedingAnimals}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Linea productiva de cria</p>
          </CardContent>
        </Card>
      </div>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Nueva ficha animal</CardTitle>
          </CardHeader>
          <CardContent>
            <AnimalForm
              mode="create"
              farms={data.farms}
              relationAnimals={data.relationAnimals}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">
              Este rol puede consultar fichas, pero no crear ni editar animales.
            </p>
          </CardContent>
        </Card>
      )}

      <AnimalList animals={data.animals} />
    </div>
  );
}
