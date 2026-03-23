import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";

const highlights = [
  "Perfiles verificados y listos para publicarse",
  "Dashboard privado por tenant con roles iniciales",
  "Base PWA preparada para instalacion y uso progresivo",
];

export function MarketplaceHero() {
  return (
    <section className="overflow-hidden border-b border-border/70">
      <div className="container grid gap-12 px-6 py-18 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-8">
          <div className="inline-flex items-center rounded-full border border-border bg-white px-4 py-2 text-sm text-muted-foreground shadow-sm">
            AgroLynk for operations, marketplace and field management
          </div>
          <div className="space-y-5">
            <h1 className="max-w-4xl text-5xl font-semibold leading-tight text-balance md:text-6xl">
              Un frente publico comercial y un dashboard privado listos para SaaS.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
              La base visual de AgroLynk prioriza claridad, confianza y lectura
              rapida para una operacion agropecuaria corporativa.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/register">
                Crear cuenta
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">Ingresar al dashboard</Link>
            </Button>
          </div>
        </div>
        <div className="rounded-[36px] border border-border bg-white p-8 shadow-[0_24px_70px_rgba(31,41,51,0.08)]">
          <div className="space-y-4">
            {highlights.map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-[24px] border border-border bg-muted px-4 py-4"
              >
                <CheckCircle2 className="mt-0.5 size-5 text-primary" />
                <p className="text-sm leading-6 text-foreground">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
