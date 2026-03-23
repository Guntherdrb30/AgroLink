import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

type AnimalSummaryProps = {
  animal: {
    internalCode: string;
    visualIdentification: string | null;
    chipCode: string | null;
    speciesName: string;
    breedName: string | null;
    sex: string;
    birthDate: string;
    estimatedAgeMonths: string;
    farmName: string;
    lotOrZone: string | null;
    productiveLine: string;
    initialWeightKg: string;
    currentWeightKg: string;
    healthStatus: string;
    reproductiveStatus: string;
    origin: string;
    notes: string;
    createdAtIso: string;
    updatedAtIso: string;
  };
  mainPhotoUrl?: string | null;
};

export function AnimalSummary({ animal, mainPhotoUrl }: AnimalSummaryProps) {
  return (
    <Card className="overflow-hidden">
      <div className="grid gap-0 lg:grid-cols-[320px_1fr]">
        <div className="bg-muted/50">
          {mainPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mainPhotoUrl}
              alt={animal.internalCode}
              className="h-full min-h-72 w-full object-cover"
            />
          ) : (
            <div className="flex h-full min-h-72 items-center justify-center px-8 text-center text-sm text-muted-foreground">
              No hay fotografia principal cargada para este animal.
            </div>
          )}
        </div>
        <div>
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  Ficha maestra
                </p>
                <CardTitle className="text-3xl">{animal.internalCode}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {animal.visualIdentification || "Identificacion visual pendiente"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{animal.healthStatus.replaceAll("_", " ")}</Badge>
                <Badge variant="secondary">
                  {animal.reproductiveStatus.replaceAll("_", " ")}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 text-sm text-muted-foreground md:grid-cols-2 xl:grid-cols-3">
              <p>
                Especie: {animal.speciesName}
                {animal.breedName ? ` / ${animal.breedName}` : ""}
              </p>
              <p>Sexo: {animal.sex.replaceAll("_", " ")}</p>
              <p>Finca: {animal.farmName}</p>
              <p>Zona: {animal.lotOrZone || "Pendiente"}</p>
              <p>Linea: {animal.productiveLine.replaceAll("_", " ")}</p>
              <p>Origen: {animal.origin || "No definido"}</p>
              <p>Chip: {animal.chipCode || "No registrado"}</p>
              <p>
                Nacimiento:{" "}
                {animal.birthDate
                  ? formatDate(animal.birthDate)
                  : `${animal.estimatedAgeMonths || "N/D"} meses estimados`}
              </p>
              <p>
                Peso inicial: {animal.initialWeightKg ? `${animal.initialWeightKg} kg` : "N/D"}
              </p>
              <p>
                Peso actual: {animal.currentWeightKg ? `${animal.currentWeightKg} kg` : "N/D"}
              </p>
              <p>Creado: {formatDate(animal.createdAtIso)}</p>
              <p>Ultima actualizacion: {formatDate(animal.updatedAtIso)}</p>
            </div>
            {animal.notes ? (
              <div className="rounded-[24px] bg-muted/60 p-5">
                <p className="text-sm font-medium">Observaciones</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {animal.notes}
                </p>
              </div>
            ) : null}
          </CardContent>
        </div>
      </div>
    </Card>
  );
}
