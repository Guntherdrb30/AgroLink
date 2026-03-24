"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  MapPinned,
  ShieldCheck,
  Tractor,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const slides = [
  {
    eyebrow: "Operacion integral",
    title: "Gestiona fincas, animales, jornadas y mercado en un solo sistema.",
    detail:
      "AgroLynk une control ganadero, planillas oficiales, verificacion documental y operacion comercial en una experiencia corporativa clara.",
    image:
      "https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=1400&q=80",
    alt: "Operacion ganadera profesional en campo abierto",
    label: "Control ganadero y trazabilidad",
  },
  {
    eyebrow: "Trabajo de llano",
    title: "Planifica la jornada, imprime la planilla y reingresa resultados sin friccion.",
    detail:
      "El flujo principal respeta la operacion real del campo: preparacion, ejecucion offline, carga posterior y actualizacion del historial animal.",
    image:
      "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1400&q=80",
    alt: "Equipo agropecuario preparando jornada de campo",
    label: "Planillas PDF, Excel y captura rapida",
  },
  {
    eyebrow: "Mercado verificado",
    title: "Muestra tu operacion con confianza y convierte interes en conversaciones reales.",
    detail:
      "Perfiles verificados, catalogos comerciales y contacto por WhatsApp para que el cliente sienta respaldo antes de negociar.",
    image:
      "https://images.unsplash.com/photo-1495107334309-fcf20504a5ab?auto=format&fit=crop&w=1400&q=80",
    alt: "Finca moderna y entorno comercial agropecuario",
    label: "Confianza comercial desde la primera visita",
  },
];

const assurances = [
  {
    icon: ShieldCheck,
    title: "Verificacion documental",
    detail: "Cuentas y fincas bajo revision antes de operar o publicar.",
  },
  {
    icon: Tractor,
    title: "Operacion de campo real",
    detail: "Jornadas, resultados offline y trazabilidad por animal.",
  },
  {
    icon: MapPinned,
    title: "Mercado con contexto",
    detail: "Ubicacion, catalogos y activos comerciales listos para crecer.",
  },
];

export function MarketplaceHero() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 6000);

    return () => window.clearInterval(intervalId);
  }, []);

  const activeSlide = slides[activeIndex];

  return (
    <section className="overflow-hidden border-b border-border/70 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafb_100%)]">
      <div className="container grid gap-10 px-6 py-14 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:py-18">
        <div className="space-y-8">
          <div className="animate-enter-up inline-flex items-center rounded-full border border-border bg-white px-4 py-2 text-sm text-muted-foreground shadow-sm">
            AgroLynk - plataforma multiempresa para operacion agropecuaria y mercado verificado
          </div>

          <div className="animate-enter-up animate-enter-delay-1 space-y-5">
            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] text-balance md:text-6xl">
              La plataforma que hace visible, ordenada y confiable la operacion de tu finca.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
              Desde la verificacion de la cuenta hasta el control de ganado, las
              jornadas de campo y la capa comercial publica, AgroLynk esta
              disenado para empresas agropecuarias que necesitan control real y
              una presencia profesional frente al mercado.
            </p>
          </div>

          <div className="animate-enter-up animate-enter-delay-2 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="min-w-[180px]">
              <Link href="/register">Solicitar acceso</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="min-w-[180px]">
              <Link href="/login">Entrar al sistema</Link>
            </Button>
          </div>

          <div className="animate-enter-up animate-enter-delay-3 grid gap-4 md:grid-cols-3">
            {assurances.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-[28px] border border-border/70 bg-white p-5 shadow-[0_18px_35px_rgba(31,41,51,0.05)]"
                >
                  <Icon className="size-5 text-primary" />
                  <p className="mt-4 text-sm font-semibold">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {item.detail}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="animate-enter-up animate-enter-delay-2 space-y-5">
          <div className="animate-float-soft relative overflow-hidden rounded-[40px] border border-border/70 bg-white p-3 shadow-[0_28px_80px_rgba(31,41,51,0.10)]">
            <div className="relative overflow-hidden rounded-[32px]">
              <div className="absolute inset-0 z-10 bg-gradient-to-t from-[rgba(17,24,39,0.68)] via-[rgba(17,24,39,0.12)] to-[rgba(255,255,255,0.05)]" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeSlide.image}
                alt={activeSlide.alt}
                className="h-[500px] w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 z-20 p-6 md:p-8">
                <div className="max-w-xl rounded-[28px] border border-white/20 bg-[rgba(255,255,255,0.10)] p-5 backdrop-blur-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/80">
                    {activeSlide.eyebrow}
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold leading-tight text-white md:text-3xl">
                    {activeSlide.title}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-white/85 md:text-base">
                    {activeSlide.detail}
                  </p>
                  <div className="mt-5 inline-flex items-center rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/85">
                    <BadgeCheck className="mr-2 size-4" />
                    {activeSlide.label}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-2">
              {slides.map((slide, index) => (
                <button
                  key={slide.title}
                  type="button"
                  aria-label={`Ver diapositiva ${index + 1}`}
                  onClick={() => setActiveIndex(index)}
                  className={`h-2.5 rounded-full transition-all ${
                    activeIndex === index ? "w-10 bg-primary" : "w-2.5 bg-border"
                  }`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setActiveIndex(
                    (current) => (current - 1 + slides.length) % slides.length,
                  )
                }
                className="flex size-11 items-center justify-center rounded-full border border-border bg-white text-foreground transition-colors hover:bg-muted"
              >
                <ArrowLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setActiveIndex((current) => (current + 1) % slides.length)
                }
                className="flex size-11 items-center justify-center rounded-full border border-border bg-white text-foreground transition-colors hover:bg-muted"
              >
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
