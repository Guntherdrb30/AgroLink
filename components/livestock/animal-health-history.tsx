import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

type AnimalHealthHistoryProps = {
  vaccinations: Array<{
    id: string;
    vaccineName: string;
    appliedAtIso: string;
    dose: string | null;
    batch: string | null;
    nextDueAtIso: string | null;
    note: string | null;
    recordedByName: string | null;
  }>;
  treatments: Array<{
    id: string;
    treatmentName: string;
    appliedAtIso: string;
    diagnosis: string | null;
    medicine: string | null;
    dose: string | null;
    withdrawalUntilIso: string | null;
    note: string | null;
    recordedByName: string | null;
  }>;
};

export function AnimalHealthHistory({
  vaccinations,
  treatments,
}: AnimalHealthHistoryProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Historial sanitario</CardTitle>
        </CardHeader>
        <CardContent>
          {vaccinations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay vacunaciones registradas.
            </p>
          ) : (
            <div className="space-y-4">
              {vaccinations.map((vaccination) => (
                <div
                  key={vaccination.id}
                  className="rounded-[24px] border border-border/70 bg-white p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-medium">{vaccination.vaccineName}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(vaccination.appliedAtIso)}
                    </p>
                  </div>
                  <div className="mt-2 grid gap-2 text-sm text-muted-foreground">
                    <p>Dosis: {vaccination.dose || "N/D"}</p>
                    <p>Lote: {vaccination.batch || "N/D"}</p>
                    <p>
                      Proxima dosis:{" "}
                      {vaccination.nextDueAtIso
                        ? formatDate(vaccination.nextDueAtIso)
                        : "No programada"}
                    </p>
                    {vaccination.note ? <p>Nota: {vaccination.note}</p> : null}
                    {vaccination.recordedByName ? (
                      <p className="text-xs uppercase tracking-[0.18em]">
                        {vaccination.recordedByName}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tratamientos</CardTitle>
        </CardHeader>
        <CardContent>
          {treatments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay tratamientos registrados.
            </p>
          ) : (
            <div className="space-y-4">
              {treatments.map((treatment) => (
                <div
                  key={treatment.id}
                  className="rounded-[24px] border border-border/70 bg-white p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-medium">{treatment.treatmentName}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(treatment.appliedAtIso)}
                    </p>
                  </div>
                  <div className="mt-2 grid gap-2 text-sm text-muted-foreground">
                    <p>Diagnostico: {treatment.diagnosis || "N/D"}</p>
                    <p>Medicamento: {treatment.medicine || "N/D"}</p>
                    <p>Dosis: {treatment.dose || "N/D"}</p>
                    <p>
                      Retiro hasta:{" "}
                      {treatment.withdrawalUntilIso
                        ? formatDate(treatment.withdrawalUntilIso)
                        : "No aplica"}
                    </p>
                    {treatment.note ? <p>Nota: {treatment.note}</p> : null}
                    {treatment.recordedByName ? (
                      <p className="text-xs uppercase tracking-[0.18em]">
                        {treatment.recordedByName}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
