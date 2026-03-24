import { Quote, Shield, Sparkles, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const trustSignals = [
  {
    icon: Shield,
    title: "Proceso verificable",
    detail: "Documentacion, perfiles y operacion respaldados antes de publicar.",
  },
  {
    icon: Users,
    title: "Pensado para equipos",
    detail: "Duenos, administradores y operadores trabajando con el mismo criterio.",
  },
  {
    icon: Sparkles,
    title: "Imagen institucional",
    detail: "La plataforma comunica orden, cuidado y profesionalismo frente al mercado.",
  },
];

const testimonials = [
  {
    quote:
      "Lo valioso no es solo registrar datos. Es que la operacion se ve seria, verificable y comercialmente confiable desde el primer contacto.",
    name: "Direccion de finca ganadera",
    role: "Operacion e inventario",
  },
  {
    quote:
      "El sistema refleja exactamente como trabajamos en campo: jornada, planilla, carga posterior y control del historial por animal.",
    name: "Coordinacion de llano",
    role: "Jornadas y control ganadero",
  },
  {
    quote:
      "La capa publica transmite mas confianza que una pagina promocional tradicional porque conecta evidencia, estructura y capacidad operativa.",
    name: "Gestion comercial agropecuaria",
    role: "Mercado y relacion con clientes",
  },
];

export function MarketplaceTestimonials() {
  return (
    <section id="confianza" className="container space-y-8 px-6">
      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-border/70 bg-[linear-gradient(180deg,#ffffff_0%,#f7fafb_100%)] shadow-[0_18px_40px_rgba(31,41,51,0.04)]">
          <CardHeader className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">
              Confianza de lanzamiento
            </p>
            <CardTitle className="max-w-xl text-3xl leading-tight">
              Una home que hace sentir que detras del sistema existe una operacion real.
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {trustSignals.map((signal) => {
              const Icon = signal.icon;

              return (
                <div
                  key={signal.title}
                  className="flex items-start gap-4 rounded-[24px] border border-border/70 bg-white p-5"
                >
                  <div className="rounded-full bg-secondary p-3">
                    <Icon className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{signal.title}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {signal.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="grid gap-5">
          {testimonials.map((item, index) => (
            <Card
              key={item.name}
              className={`border-border/70 bg-white shadow-[0_18px_40px_rgba(31,41,51,0.04)] animate-enter-up ${
                index === 0
                  ? ""
                  : index === 1
                    ? "animate-enter-delay-1"
                    : "animate-enter-delay-2"
              }`}
            >
              <CardContent className="p-6">
                <Quote className="size-5 text-primary" />
                <p className="mt-4 text-base leading-8 text-foreground">
                  {item.quote}
                </p>
                <div className="mt-6 border-t border-border/70 pt-4">
                  <p className="text-sm font-semibold">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.role}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
