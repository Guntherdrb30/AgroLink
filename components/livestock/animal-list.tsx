import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function labelForSex(value: string) {
  switch (value) {
    case "FEMALE":
      return "Hembra";
    case "MALE":
      return "Macho";
    default:
      return "No definido";
  }
}

function labelForProductiveLine(value: string) {
  switch (value) {
    case "BEEF":
      return "Carne";
    case "DAIRY":
      return "Leche";
    case "DUAL_PURPOSE":
      return "Doble proposito";
    case "BREEDING":
      return "Cria";
    case "WORK":
      return "Trabajo";
    default:
      return "Otro";
  }
}

function badgeClassForHealth(value: string) {
  switch (value) {
    case "HEALTHY":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "UNDER_OBSERVATION":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "SICK":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "RECOVERING":
      return "border-sky-200 bg-sky-50 text-sky-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

type AnimalListProps = {
  animals: Array<{
    id: string;
    internalCode: string;
    visualIdentification: string | null;
    speciesName: string;
    breedName: string | null;
    sex: string;
    farmName: string;
    lotOrZone: string | null;
    productiveLine: string;
    currentWeightKg: string | null;
    healthStatus: string;
    reproductiveStatus: string;
    origin: string | null;
    photoUrl: string | null;
  }>;
};

export function AnimalList({ animals }: AnimalListProps) {
  if (animals.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">
            Aun no hay animales registrados en esta empresa.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {animals.map((animal) => (
        <Card key={animal.id} className="overflow-hidden">
          <div className="grid gap-0 md:grid-cols-[168px_1fr]">
            <div className="bg-muted/50">
              {animal.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={animal.photoUrl}
                  alt={animal.internalCode}
                  className="h-full min-h-44 w-full object-cover"
                />
              ) : (
                <div className="flex h-full min-h-44 items-center justify-center px-6 text-center text-sm text-muted-foreground">
                  Sin foto
                </div>
              )}
            </div>
            <div>
              <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle>{animal.internalCode}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {animal.visualIdentification || "Identificacion visual pendiente"}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={badgeClassForHealth(animal.healthStatus)}
                  >
                    {animal.healthStatus.replaceAll("_", " ")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
                  <p>
                    {animal.speciesName}
                    {animal.breedName ? ` / ${animal.breedName}` : ""}
                  </p>
                  <p>{labelForSex(animal.sex)}</p>
                  <p>{animal.farmName}</p>
                  <p>{animal.lotOrZone || "Zona pendiente"}</p>
                  <p>{labelForProductiveLine(animal.productiveLine)}</p>
                  <p>{animal.currentWeightKg ? `${animal.currentWeightKg} kg` : "Peso N/D"}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Badge variant="secondary">{animal.reproductiveStatus.replaceAll("_", " ")}</Badge>
                  {animal.origin ? <Badge variant="outline">{animal.origin}</Badge> : null}
                </div>
                <Button asChild variant="outline">
                  <Link href={`/livestock/${animal.id}`}>Ver ficha completa</Link>
                </Button>
              </CardContent>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
