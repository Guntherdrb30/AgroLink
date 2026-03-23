import Link from "next/link";

import { VerificationBadge } from "@/components/shared/verification-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type VerificationGateProps = {
  status: import("@prisma/client").VerificationStatus;
};

export function VerificationGate({ status }: VerificationGateProps) {
  if (status === "VERIFIED") {
    return null;
  }

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">
            Operacion restringida
          </p>
          <CardTitle className="text-2xl text-amber-950">
            La cuenta aun no esta verificada.
          </CardTitle>
        </div>
        <VerificationBadge status={status} />
      </CardHeader>
      <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <p className="max-w-2xl text-sm leading-7 text-amber-900">
          La publicacion comercial y los modulos operativos deben permanecer bloqueados
          hasta que el perfil del tenant sea aprobado por plataforma.
        </p>
        <Button asChild variant="outline">
          <Link href="/verification">Completar verificacion</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
