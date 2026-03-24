import Link from "next/link";

import { VerificationBadge } from "@/components/shared/verification-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type FarmListProps = {
  farms: Array<{
    id: string;
    name: string;
    location: string | null;
    hectares: string | null;
    status: string;
    verificationStatus: import("@prisma/client").VerificationStatus;
  }>;
};

export function FarmList({ farms }: FarmListProps) {
  if (farms.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">
            Aun no hay fincas registradas para esta empresa.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {farms.map((farm) => (
        <Card key={farm.id}>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div className="space-y-2">
              <CardTitle>{farm.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {farm.location || "Ubicacion pendiente"}
              </p>
            </div>
            <VerificationBadge status={farm.verificationStatus} />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
              <p>Hectareas: {farm.hectares || "N/D"}</p>
              <p>Estado operativo: {farm.status}</p>
            </div>
            <Button asChild variant="outline">
              <Link href={`/farms/${farm.id}`}>Administrar finca</Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
