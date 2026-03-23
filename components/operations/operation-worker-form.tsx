import { addOperationWorkerAction } from "@/server/actions/livestock-operation-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const workerRoleOptions = [
  { value: "SUPERVISOR", label: "Supervisor" },
  { value: "OPERATOR", label: "Operador" },
  { value: "VETERINARY", label: "Veterinario" },
  { value: "RECORDER", label: "Registrador" },
  { value: "DRIVER", label: "Chofer" },
  { value: "OTHER", label: "Otro" },
];

type OperationWorkerFormProps = {
  operationId: string;
  employees: Array<{
    id: string;
    fullName: string;
  }>;
  workers: Array<{
    id: string;
    fullName: string;
    role: string;
    employeeName: string | null;
    notes: string | null;
  }>;
};

export function OperationWorkerForm({
  operationId,
  employees,
  workers,
}: OperationWorkerFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal involucrado</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <form action={addOperationWorkerAction} className="grid gap-4">
          <input type="hidden" name="operationId" value={operationId} />
          <div className="grid gap-4 md:grid-cols-2">
            <select
              name="employeeId"
              className="flex h-11 w-full rounded-[22px] border border-input bg-background px-4 text-sm"
              defaultValue=""
            >
              <option value="">Empleado no vinculado</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.fullName}
                </option>
              ))}
            </select>
            <Input name="fullName" placeholder="Nombre visible en jornada" required />
          </div>
          <div className="grid gap-4 md:grid-cols-[220px_1fr]">
            <select
              name="role"
              defaultValue="OPERATOR"
              className="flex h-11 w-full rounded-[22px] border border-input bg-background px-4 text-sm"
            >
              {workerRoleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Textarea name="notes" placeholder="Notas del rol o asignacion" />
          </div>
          <div>
            <Button type="submit" variant="outline">
              Registrar trabajador
            </Button>
          </div>
        </form>
        <div className="space-y-3">
          {workers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aun no hay personal asociado a la jornada.
            </p>
          ) : (
            workers.map((worker) => (
              <div
                key={worker.id}
                className="rounded-[24px] border border-border/70 bg-white p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-medium">{worker.fullName}</p>
                  <p className="text-sm text-muted-foreground">
                    {worker.role.replaceAll("_", " ")}
                  </p>
                </div>
                {worker.employeeName ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Empleado: {worker.employeeName}
                  </p>
                ) : null}
                {worker.notes ? (
                  <p className="mt-2 text-sm text-muted-foreground">{worker.notes}</p>
                ) : null}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
