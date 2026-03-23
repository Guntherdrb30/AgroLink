import { saveOperationAnimalResultAction } from "@/server/actions/livestock-operation-actions";
import { VisualCodeScanner } from "@/components/operations/visual-code-scanner";
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

type OperationLookupPanelProps = {
  operationId: string;
  lookup: {
    raw: string;
    normalized: string;
    match: {
      operationAnimalId: string;
      internalCode: string;
      visualIdentification: string | null;
      currentWeightKg: string;
      status: string;
    } | null;
  };
};

export function OperationLookupPanel({
  operationId,
  lookup,
}: OperationLookupPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Captura digital rapida por codigo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <form className="grid gap-4 md:grid-cols-[1fr_auto]" action={`/operations/${operationId}`}>
          <Input
            name="lookup"
            defaultValue={lookup.raw}
            placeholder="Codigo visual, interno o chip"
          />
          <Button type="submit" variant="outline">
            Buscar
          </Button>
        </form>

        <VisualCodeScanner operationId={operationId} initialCode={lookup.raw} />

        {lookup.raw ? (
          lookup.match ? (
            <div className="space-y-4 rounded-[28px] border border-emerald-200 bg-emerald-50/50 p-5">
              <div>
                <p className="font-medium">
                  {lookup.match.internalCode}
                  {lookup.match.visualIdentification
                    ? ` - ${lookup.match.visualIdentification}`
                    : ""}
                </p>
                <p className="text-sm text-muted-foreground">
                  Estado actual: {lookup.match.status} · peso {lookup.match.currentWeightKg || "N/D"} kg
                </p>
              </div>
              <form action={saveOperationAnimalResultAction} className="grid gap-4">
                <input type="hidden" name="operationId" value={operationId} />
                <input
                  type="hidden"
                  name="operationAnimalId"
                  value={lookup.match.operationAnimalId}
                />
                <input type="hidden" name="lookupCode" value={lookup.raw} />
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Input name="weightKg" placeholder="Peso nuevo" />
                  <Input name="vaccineName" placeholder="Vacuna" />
                  <Input name="dewormingName" placeholder="Desparasitacion" />
                  <Input name="treatmentName" placeholder="Tratamiento" />
                </div>
                <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                  <select
                    name="generalStatus"
                    defaultValue="NOT_CHECKED"
                    className="flex h-11 w-full rounded-[22px] border border-input bg-background px-4 text-sm"
                  >
                    {generalStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <Textarea name="observations" placeholder="Observaciones rapidas" />
                </div>
                <div>
                  <Button type="submit">Guardar captura</Button>
                </div>
              </form>
            </div>
          ) : (
            <div className="rounded-[24px] border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-800">
              No hubo coincidencia para el codigo buscado. Corrige manualmente y vuelve a intentar.
            </div>
          )
        ) : null}
      </CardContent>
    </Card>
  );
}
