import Link from "next/link";

import { OperationStatusBadge } from "@/components/operations/operation-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

type OperationListProps = {
  operations: Array<{
    id: string;
    title: string;
    farmName: string;
    status: string;
    operationDateIso: string;
    plannedTypes: string[];
    animalsCount: number;
    expensesCount: number;
    workersCount: number;
  }>;
};

export function OperationList({ operations }: OperationListProps) {
  if (operations.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">
            Aun no hay jornadas creadas.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {operations.map((operation) => (
        <Card key={operation.id}>
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle>{operation.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {operation.farmName} · {formatDate(operation.operationDateIso)}
                </p>
              </div>
              <OperationStatusBadge status={operation.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {operation.plannedTypes.join(", ")}
            </p>
            <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
              <p>{operation.animalsCount} animales</p>
              <p>{operation.expensesCount} gastos</p>
              <p>{operation.workersCount} trabajadores</p>
            </div>
            <Button asChild variant="outline">
              <Link href={`/operations/${operation.id}`}>Abrir jornada</Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
