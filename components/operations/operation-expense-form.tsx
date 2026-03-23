import { addOperationExpenseAction } from "@/server/actions/livestock-operation-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type OperationExpenseFormProps = {
  operationId: string;
  expenses: Array<{
    id: string;
    label: string;
    amount: string;
    notes: string | null;
  }>;
};

export function OperationExpenseForm({
  operationId,
  expenses,
}: OperationExpenseFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gastos de jornada</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <form action={addOperationExpenseAction} className="grid gap-4">
          <input type="hidden" name="operationId" value={operationId} />
          <div className="grid gap-4 md:grid-cols-2">
            <Input name="label" placeholder="Combustible, vacuna, alimentacion" required />
            <Input name="amount" placeholder="Monto" required />
          </div>
          <Textarea name="notes" placeholder="Notas del gasto" />
          <div>
            <Button type="submit" variant="outline">
              Registrar gasto
            </Button>
          </div>
        </form>
        <div className="space-y-3">
          {expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay gastos registrados.
            </p>
          ) : (
            expenses.map((expense) => (
              <div
                key={expense.id}
                className="rounded-[24px] border border-border/70 bg-white p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-medium">{expense.label}</p>
                  <p className="text-sm text-muted-foreground">{expense.amount}</p>
                </div>
                {expense.notes ? (
                  <p className="mt-2 text-sm text-muted-foreground">{expense.notes}</p>
                ) : null}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
