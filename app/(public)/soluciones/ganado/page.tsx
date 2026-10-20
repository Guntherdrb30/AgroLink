import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPageIntro } from "@/components/marketing/marketing-page-intro";
import { Button } from "@/components/ui/button";
export const metadata:Metadata={title:"Gestión ganadera",description:"Inventario y trazabilidad ganadera con GanadIA."};
export default function GanadoSolutionPage(){return <><MarketingPageIntro eyebrow="Soluciones / Ganado" title="Cada animal, una ficha con su historial." description="Gestiona la identificación de animales y centraliza información de genealogía, peso, sanidad y eventos registrados."/><section className="container space-y-6 px-5 py-14 sm:px-6"><div className="grid gap-5 sm:grid-cols-3">{["Identificación individual","Seguimiento sanitario","Inventario por finca"].map(t=><div key={t} className="rounded-3xl border bg-white p-7 text-lg font-semibold">{t}</div>)}</div><Button asChild><Link href="/livestock">Ir a ganado</Link></Button></section></>;}
