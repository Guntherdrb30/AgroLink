import Link from "next/link";
import { allowedFarmIds } from "@/lib/permissions/farm-access";
import { notFound } from "next/navigation";

import {
  applyOperationResultsAction,
  generateOperationExcelSheetAction,
  generateOperationPdfSheetAction,
  importOperationExcelAction,
} from "@/server/actions/livestock-operation-actions";
import { requireOperationalTenant, requireRole } from "@/lib/auth/session";
import { OperationExpenseForm } from "@/components/operations/operation-expense-form";
import { OperationLookupPanel } from "@/components/operations/operation-lookup-panel";
import { OperationResultsTable } from "@/components/operations/operation-results-table";
import { OperationStatusBadge } from "@/components/operations/operation-status-badge";
import { OperationWorkerForm } from "@/components/operations/operation-worker-form";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLivestockOperationDetailData } from "@/server/queries/livestock-operation-query";

export const dynamic = "force-dynamic";

const viewerRoles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "FARM_MANAGER",
  "OPERATOR",
] as const;

const managementRoles = ["TENANT_OWNER", "TENANT_ADMIN", "FARM_MANAGER", "OPERATOR"];
const adminRoles = ["TENANT_OWNER", "TENANT_ADMIN", "FARM_MANAGER"];

type OperationDetailPageProps = {
  params: Promise<{
    operationId: string;
  }>;
  searchParams: Promise<{
    lookup?: string;
  }>;
};

export default async function OperationDetailPage({
  params,
  searchParams,
}: OperationDetailPageProps) {
  const { operationId } = await params;
  const { lookup } = await searchParams;
  const { tenantContext } = await requireRole({
    tenant: [...viewerRoles],
  });
  await requireOperationalTenant();

  if (!tenantContext) {
    notFound();
  }

  const data = await getLivestockOperationDetailData(
    tenantContext.tenant.id,
    operationId,
    lookup,
  );

  if (!data) {
    notFound();
  }

  const grants=await allowedFarmIds(tenantContext.tenant.id,tenantContext.user.id,tenantContext.membership.role);
  if(grants&&!grants.includes(data.operation.farmId))notFound();
  const canManage = managementRoles.includes(tenantContext.membership.role);
  const canAdmin = adminRoles.includes(tenantContext.membership.role);
  const editable = !["APPLIED", "CANCELLED"].includes(data.operation.status);
  const hasPending = data.animals.some((animal) => animal.status === "PENDING");
  const readyToApply = data.operation.status === "RESULTS_CAPTURED" && !hasPending && data.animals.some((animal) => animal.status === "CAPTURED");

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Jornada ganadera"
        title={data.operation.title}
        description="Consulta los resultados, controla personal y gastos, y actualiza el historial animal cuando el responsable autorice el cierre."
      />

      <div className="flex flex-wrap items-center gap-3">
        <OperationStatusBadge status={data.operation.status} />
        <span className="text-sm text-muted-foreground">
          {data.operation.farmName} · {data.operation.operationDateIso.slice(0, 10)}
        </span>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Planillas internas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap gap-3">
              {editable && <form action={generateOperationPdfSheetAction}>
                <input type="hidden" name="operationId" value={data.operation.id} />
                <Button type="submit">Generar PDF</Button>
              </form>}
              {editable && <form action={generateOperationExcelSheetAction}>
                <input type="hidden" name="operationId" value={data.operation.id} />
                <Button type="submit" variant="outline">
                  Generar Excel
                </Button>
              </form>}
            </div>

            {editable && <form action={importOperationExcelAction} className="grid gap-4 md:grid-cols-[1fr_auto]">
              <input type="hidden" name="operationId" value={data.operation.id} />
              <input
                type="file"
                name="resultsFile"
                accept=".xlsx"
                className="flex h-11 w-full rounded-[22px] border border-input bg-background px-4 py-2 text-sm"
              />
              <Button type="submit" variant="outline">
                Reimportar Excel
              </Button>
            </form>}

            <div className="space-y-3">
              {data.sheets.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aun no hay planillas generadas o cargadas para esta jornada.
                </p>
              ) : (
                data.sheets.map((sheet) => (
                  <div
                    key={sheet.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-border/70 bg-white p-4"
                  >
                    <div>
                      <p className="font-medium">{sheet.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {sheet.type} · {sheet.source} · v{sheet.version}
                      </p>
                    </div>
                    {sheet.fileId ? (
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/api/operation-sheets/${sheet.fileId}`}>Abrir archivo</Link>
                      </Button>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Tipos: {data.operation.plannedTypes.join(", ")}</p>
            <p>Animales: {data.animals.length}</p>
            <p>Hojas: {data.sheets.length}</p>
            <p>Resultados aplicados: {data.operation.resultsAppliedAtIso ? "Si" : "No"}</p>
            {data.operation.notes ? <p>Nota: {data.operation.notes}</p> : null}
            {canAdmin && readyToApply ? (
              <form action={applyOperationResultsAction}>
                <input type="hidden" name="operationId" value={data.operation.id} />
                <Button type="submit" className="mt-3 w-full">
                  Aplicar resultados al historial
                </Button>
              </form>
            ) : !editable ? <p className="text-xs text-emerald-700">Jornada cerrada: historial protegido.</p> : null}
          </CardContent>
        </Card>
      </div>

      {canManage && editable ? (
        <OperationLookupPanel operationId={data.operation.id} lookup={data.lookup} />
      ) : null}

      {canManage && editable ? (
        <OperationResultsTable
          operationId={data.operation.id}
          animals={data.animals}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Resultados capturados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.animals.map((animal) => (
              <div
                key={animal.id}
                className="rounded-[24px] border border-border/70 bg-white p-4 text-sm text-muted-foreground"
              >
                <p className="font-medium text-foreground">
                  {animal.internalCode}
                  {animal.visualIdentification ? ` - ${animal.visualIdentification}` : ""}
                </p>
                <p>
                  Estado: {animal.status} · general {animal.generalStatus}
                </p>
                <p>
                  Peso: {animal.weightKg || "N/D"} · vacuna: {animal.vaccineName || "N/D"}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {canAdmin && editable ? (
        <div className="grid gap-5 xl:grid-cols-2">
          <OperationExpenseForm
            operationId={data.operation.id}
            expenses={data.expenses}
          />
          <OperationWorkerForm
            operationId={data.operation.id}
            employees={data.employees}
            workers={data.workers}
          />
        </div>
      ) : null}
    </div>
  );
}
