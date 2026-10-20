import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPageIntro } from "@/components/marketing/marketing-page-intro";
import { Button } from "@/components/ui/button";
export const metadata:Metadata={title:"Jornadas de campo",description:"Planifica jornadas y consolida resultados de campo en GanadIA."};
export default function JornadasSolutionPage(){return <><MarketingPageIntro eyebrow="Soluciones / Jornadas" title="Del plan de trabajo a los resultados." description="Organiza las jornadas de control ganadero, genera planillas para el trabajo fuera de línea y registra posteriormente los resultados."/><section className="container space-y-6 px-5 py-14 sm:px-6"><div className="grid gap-5 sm:grid-cols-3">{["Planificación de actividades","Planillas para campo","Registro de resultados"].map(t=><div key={t} className="rounded-3xl border bg-white p-7 text-lg font-semibold">{t}</div>)}</div><Button asChild><Link href="/operations">Ir a jornadas</Link></Button></section></>;}
