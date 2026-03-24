import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const steps = [
  {
    step: "01",
    title: "Verifica tu operacion",
    detail:
      "AgroLynk valida cuenta, documentos y fincas para abrir una operacion privada mas segura y una presencia publica con respaldo.",
    badge: "Confianza",
  },
  {
    step: "02",
    title: "Ordena el campo y el ganado",
    detail:
      "Centraliza animales, jornadas, personal, gastos y resultados de llano con un flujo pensado para la realidad del terreno.",
    badge: "Operacion",
  },
  {
    step: "03",
    title: "Publica y convierte",
    detail:
      "Muestra fincas, catalogos y publicaciones en un mercado institucional donde la informacion correcta transmite seriedad.",
    badge: "Crecimiento",
  },
];

export function MarketplacePreview() {
  return (
    <div className="grid gap-5 xl:grid-cols-3">
      {steps.map((step) => (
        <Card
          key={step.title}
          className="overflow-hidden border-border/70 bg-white shadow-[0_16px_40px_rgba(31,41,51,0.05)]"
        >
          <div className="h-2 bg-[linear-gradient(90deg,#70572f_0%,#95a57a_100%)]" />
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-4xl font-semibold text-primary/20">{step.step}</span>
              <Badge variant="secondary" className="w-fit">
                {step.badge}
              </Badge>
            </div>
            <CardTitle className="text-2xl leading-tight">{step.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-7 text-muted-foreground">
              {step.detail}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
