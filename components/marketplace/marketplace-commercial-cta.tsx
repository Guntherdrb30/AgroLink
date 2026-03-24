import Link from "next/link";
import { ArrowRight, CheckCheck, MessageSquareMore } from "lucide-react";

import { Button } from "@/components/ui/button";

const pillars = [
  "Control operativo por finca y por animal",
  "Jornadas oficiales listas para uso offline",
  "Marketplace con percepcion institucional mas fuerte",
  "Proceso de adopcion claro para equipos reales",
];

export function MarketplaceCommercialCta() {
  return (
    <section className="container px-6">
      <div className="overflow-hidden rounded-[42px] border border-border/70 bg-[linear-gradient(135deg,#f8fafb_0%,#ffffff_48%,#eef3f5_100%)] shadow-[0_26px_70px_rgba(31,41,51,0.07)]">
        <div className="grid gap-10 px-8 py-10 md:px-12 md:py-14 lg:grid-cols-[1fr_0.8fr] lg:items-center">
          <div className="space-y-5">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">
              Paso siguiente
            </p>
            <h2 className="max-w-3xl text-4xl font-semibold leading-tight text-balance">
              Lleva tu operacion agropecuaria a una plataforma que inspire confianza interna y externa.
            </h2>
            <p className="max-w-2xl text-base leading-8 text-muted-foreground">
              AgroLynk esta construido para que la organizacion del campo, la
              trazabilidad del ganado y la cara comercial del negocio hablen el
              mismo idioma. Esa coherencia es la que genera seguridad en equipos,
              aliados y clientes.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {pillars.map((pillar) => (
                <div
                  key={pillar}
                  className="flex items-start gap-3 rounded-[24px] border border-border/70 bg-white/80 px-4 py-4"
                >
                  <CheckCheck className="mt-0.5 size-4 text-primary" />
                  <p className="text-sm leading-6 text-foreground">{pillar}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 rounded-[32px] border border-border/70 bg-white p-6 shadow-[0_18px_40px_rgba(31,41,51,0.05)]">
            <p className="text-lg font-semibold">Agenda una conversacion inicial</p>
            <p className="text-sm leading-7 text-muted-foreground">
              Si tu objetivo es lanzar una operacion mas ordenada, verificable y
              comercialmente presentable, esta es la puerta correcta de entrada.
            </p>
            <div className="flex flex-col gap-3">
              <Button asChild size="lg">
                <Link href="/register">
                  Solicitar acceso
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">Entrar al sistema</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/#contacto">
                  Hablar por WhatsApp
                  <MessageSquareMore className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
