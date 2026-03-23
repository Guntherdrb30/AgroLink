import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ParentCard = {
  id: string;
  internalCode: string;
  visualIdentification: string | null;
  speciesName: string;
  breedName: string | null;
  farmName: string;
} | null;

type AnimalGenealogyProps = {
  father: ParentCard;
  mother: ParentCard;
};

function ParentSummary({
  title,
  parent,
}: {
  title: string;
  parent: ParentCard;
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {parent ? (
          <>
            <div className="space-y-2">
              <p className="text-base font-medium">{parent.internalCode}</p>
              <p className="text-sm text-muted-foreground">
                {parent.visualIdentification || "Sin identificacion visual"}
              </p>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                {parent.speciesName}
                {parent.breedName ? ` / ${parent.breedName}` : ""}
              </p>
              <p>{parent.farmName}</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={`/livestock/${parent.id}`}>Abrir ficha</Link>
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No existe relacion registrada para este parentesco.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function AnimalGenealogy({ father, mother }: AnimalGenealogyProps) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <ParentSummary title="Padre" parent={father} />
      <ParentSummary title="Madre" parent={mother} />
    </div>
  );
}
