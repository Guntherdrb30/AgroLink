import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const blocks = [
  {
    title: "Fincas verificadas",
    detail:
      "Perfiles documentales, activos visuales y contexto legal para abrir operacion completa con respaldo.",
  },
  {
    title: "Ganado con trazabilidad",
    detail:
      "Fichas maestras por animal, peso, sanidad, genealogia y cronologia operacional consolidada.",
  },
  {
    title: "Jornadas de control",
    detail:
      "Planillas oficiales PDF y Excel, reimportacion de resultados y captura rapida por codigo o imagen.",
  },
  {
    title: "Mercado institucional",
    detail:
      "Una cara publica sobria y confiable para mostrar la operacion y activar conversaciones comerciales.",
  },
];

export function MarketplaceSolutions() {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {blocks.map((block) => (
        <Card
          key={block.title}
          className="border-border/70 bg-[linear-gradient(180deg,#ffffff_0%,#fafcfd_100%)] shadow-[0_16px_40px_rgba(31,41,51,0.04)]"
        >
          <CardHeader>
            <CardTitle className="text-2xl">{block.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-7 text-muted-foreground">
              {block.detail}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
