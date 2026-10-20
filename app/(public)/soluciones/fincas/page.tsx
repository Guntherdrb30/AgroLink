import type { Metadata } from "next";
import Link from "next/link";
import { MapPinned, Images, Building2 } from "lucide-react";
import { MarketingPageIntro } from "@/components/marketing/marketing-page-intro";
import { Button } from "@/components/ui/button";
export const metadata:Metadata={title:"Gestión de fincas",description:"Organiza y administra fincas en GanadIA."};
export default function FincasSolutionPage(){return <><MarketingPageIntro eyebrow="Soluciones / Fincas" title="Información de tus fincas en un solo lugar." description="Registra los datos principales de cada finca y administra su perfil desde un entorno privado vinculado a tu empresa."/><section className="container grid gap-5 px-5 py-14 sm:px-6 md:grid-cols-3">{[[MapPinned,"Ubicación","Datos de localización y extensión."],[Images,"Identidad visual","Fotografía principal y logotipo de finca."],[Building2,"Organización","Consulta y edición según permisos."]].map(([I,title,body],i)=>{const Icon=I as typeof MapPinned;return <article key={i} className="rounded-3xl border bg-white p-6"><Icon className="size-7 text-primary"/><h2 className="mt-5 text-xl font-bold">{title as string}</h2><p className="mt-2 text-sm leading-7 text-muted-foreground">{body as string}</p></article>})}<div className="md:col-span-3"><Button asChild><Link href="/farms">Ir a mis fincas</Link></Button></div></section></>;}
