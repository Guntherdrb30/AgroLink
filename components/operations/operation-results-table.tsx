import { saveOperationAnimalResultAction } from "@/server/actions/livestock-operation-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const generalStatusOptions = [
  { value: "NOT_CHECKED", label: "No revisado" },
  { value: "GOOD", label: "Bueno" },
  { value: "UNDER_OBSERVATION", label: "Observacion" },
  { value: "SICK", label: "Enfermo" },
  { value: "CRITICAL", label: "Critico" },
];

type OperationResultsTableProps = {
  operationId: string;
  animals: Array<{
    id: string;
    animalId: string;
    internalCode: string;
    visualIdentification: string | null;
    lotOrZone: string | null;
    speciesName: string;
    breedName: string | null;
    status: string;
    generalStatus: string;
    weightKg: string | null;
    vaccineName: string | null;
    dewormingName: string | null;
    treatmentName: string | null;
    observations: string | null;
    currentWeightKg: string | null;
    appliedToAnimalHistory: boolean;
  }>;
};

export function OperationResultsTable({
  operationId,
  animals,
}: OperationResultsTableProps) {
  return (
    <div className="space-y-5">
      {animals.map((row) => (
        <Card key={row.id}>
          <CardHeader>
            <CardTitle className="text-lg">
              {row.internalCode}
              {row.visualIdentification ? ` - ${row.visualIdentification}` : ""}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {row.speciesName}
              {row.breedName ? ` / ${row.breedName}` : ""} · {row.lotOrZone || "Zona pendiente"} · peso actual {row.currentWeightKg || "N/D"} kg
            </p>
          </CardHeader>
          <CardContent>
            <form action={saveOperationAnimalResultAction} className="grid gap-4">
              <input type="hidden" name="operationId" value={operationId} />
              <input type="hidden" name="operationAnimalId" value={row.id} />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Input name="weightKg" defaultValue={row.weightKg ?? ""} placeholder="Peso nuevo" />
                <Input
                  name="vaccineName"
                  defaultValue={row.vaccineName ?? ""}
                  placeholder="Vacuna"
                />
                <Input
                  name="dewormingName"
                  defaultValue={row.dewormingName ?? ""}
                  placeholder="Desparasitacion"
                />
                <Input
                  name="treatmentName"
                  defaultValue={row.treatmentName ?? ""}
                  placeholder="Tratamiento"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-[220px_1fr_auto]">
                <select
                  name="generalStatus"
                  defaultValue={row.generalStatus}
                  className="flex h-11 w-full rounded-[22px] border border-input bg-background px-4 text-sm"
                >
                  {generalStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <Textarea
                  name="observations"
                  defaultValue={row.observations ?? ""}
                  placeholder="Observaciones de la jornada"
                />
                <label className="flex items-center gap-3 rounded-[22px] border border-border/70 px-4 py-3 text-sm">
                  <input type="checkbox" name="skipped" defaultChecked={row.status === "SKIPPED"} />
                  Omitido
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" variant="outline">
                  Guardar resultado
                </Button>
                {row.appliedToAnimalHistory ? (
                  <span className="text-xs uppercase tracking-[0.18em] text-emerald-700">
                    Aplicado al historial
                  </span>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
