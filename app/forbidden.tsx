import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-6">
      <div className="max-w-md space-y-4 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">
          AgroLynk
        </p>
        <h1 className="text-4xl font-semibold text-balance">Acceso denegado.</h1>
        <p className="text-muted-foreground">
          Tu cuenta esta autenticada, pero no tiene permisos para realizar esta accion.
        </p>
        <Button asChild>
          <Link href="/dashboard">Ir al panel</Link>
        </Button>
      </div>
    </main>
  );
}
