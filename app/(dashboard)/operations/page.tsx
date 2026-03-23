import { requireOperationalTenant, requireRole } from "@/lib/auth/session";
import { OperationForm } from "@/components/operations/operation-form";
import { OperationList } from "@/components/operations/operation-list";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLivestockOperationsIndexData } from "@/server/queries/livestock-operation-query";

export const dynamic = "force-dynamic";

const viewerRoles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "FARM_MANAGER",
  "ACCOUNTING",
  "OPERATOR",
] as const;

const managementRoles = ["TENANT_OWNER", "TENANT_ADMIN", "FARM_MANAGER", "OPERATOR"];

export default async function OperationsPage() {
  const { tenantContext } = await requireRole({
    tenant: [...viewerRoles],
  });
  await requireOperationalTenant();

  if (!tenantContext) {
    return null;
  }

  const canManage = managementRoles.includes(tenantContext.membership.role);
  const data = await getLivestockOperationsIndexData(tenantContext.tenant.id);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Trabajos de llano"
        title="Jornadas oficiales de control ganadero con flujo offline."
        description="La jornada se planifica, genera planillas oficiales, se ejecuta fuera de linea y luego reingresa al sistema para actualizar inventario e historial animal."
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-4xl">{data.metrics.totalOperations}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Jornadas creadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-4xl">{data.metrics.pendingApplication}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Pendientes de aplicar</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-4xl">{data.metrics.totalSheets}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Planillas generadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-4xl">{data.metrics.totalTrackedAnimals}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Animales en jornadas</p>
          </CardContent>
        </Card>
      </div>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Nueva jornada</CardTitle>
          </CardHeader>
          <CardContent>
            <OperationForm farms={data.farms} animals={data.animals} />
          </CardContent>
        </Card>
      ) : null}

      <OperationList operations={data.operations} />
    </div>
  );
}
