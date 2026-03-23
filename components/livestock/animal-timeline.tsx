import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

type AnimalTimelineProps = {
  items: Array<{
    id: string;
    type: string;
    label: string;
    title: string;
    description: string | null;
    dateIso: string;
    actorName: string | null;
  }>;
};

export function AnimalTimeline({ items }: AnimalTimelineProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline operacional</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aun no hay eventos en la linea de tiempo.
          </p>
        ) : (
          <div className="space-y-5">
            {items.map((item) => (
              <div
                key={item.id}
                className="grid gap-3 border-b border-border/60 pb-5 last:border-b-0 last:pb-0 md:grid-cols-[170px_1fr]"
              >
                <div className="space-y-2">
                  <Badge variant="outline">{item.label}</Badge>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(item.dateIso)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="font-medium">{item.title}</p>
                  {item.description ? (
                    <p className="text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </p>
                  ) : null}
                  {item.actorName ? (
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Registrado por {item.actorName}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
