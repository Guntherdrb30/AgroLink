import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

type AnimalWeightHistoryProps = {
  records: Array<{
    id: string;
    weightKg: string;
    recordedAtIso: string;
    note: string | null;
    recordedByName: string | null;
  }>;
};

export function AnimalWeightHistory({ records }: AnimalWeightHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de pesos</CardTitle>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay pesos registrados.</p>
        ) : (
          <div className="space-y-4">
            {records.map((record) => (
              <div
                key={record.id}
                className="flex flex-col gap-2 rounded-[24px] border border-border/70 bg-white p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-lg font-semibold">{record.weightKg} kg</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(record.recordedAtIso)}
                  </p>
                </div>
                {record.note ? (
                  <p className="text-sm text-muted-foreground">{record.note}</p>
                ) : null}
                {record.recordedByName ? (
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {record.recordedByName}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
