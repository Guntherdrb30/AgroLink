import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const nextSteps = [
  "Crear la base de fincas y verificacion documental",
  "Conectar ganado y trazabilidad",
  "Activar gastos, trabajos de llano y personal",
];

export function DashboardEmptyState() {
  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Estado inicial
          </p>
          <CardTitle className="text-3xl">
            El panel esta listo para recibir los modulos del producto.
          </CardTitle>
        </div>
        <Button variant="outline">Configurar empresa</Button>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        {nextSteps.map((step, index) => (
          <div key={step} className="rounded-[24px] bg-muted p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
              Paso {index + 1}
            </p>
            <p className="mt-3 text-sm leading-7 text-foreground">{step}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
