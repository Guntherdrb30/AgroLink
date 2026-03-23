import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-6">
      <div className="max-w-md space-y-4 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">
          AgroLynk
        </p>
        <h1 className="text-4xl font-semibold text-balance">
          La ruta solicitada no existe.
        </h1>
        <p className="text-muted-foreground">
          Revisa la navegación o vuelve al inicio público del producto.
        </p>
        <Button asChild>
          <Link href="/">Volver al inicio</Link>
        </Button>
      </div>
    </main>
  );
}
