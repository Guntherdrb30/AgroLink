import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, ClipboardList, Layers3, LockKeyhole, Smartphone } from "lucide-react";
import { MarketingPageIntro } from "@/components/marketing/marketing-page-intro";
import { FeatureLink } from "@/components/marketing/feature-link";
import { Button } from "@/components/ui/button";
export const metadata: Metadata = { title: "Plataforma", description: "Conoce GanadIA: gestión agropecuaria multiempresa para fincas, ganado y jornadas." };
export default function PlataformaPage() { return <>
 <MarketingPageIntro eyebrow="La plataforma" title="Toda tu operación agropecuaria, mejor organizada." description="GanadIA conecta información de fincas, ganado y trabajos de campo en un mismo entorno, con acceso por empresa y responsabilidades definidas."/>
 <section className="container space-y-8 px-5 py-14 sm:px-6"><div className="grid gap-5 md:grid-cols-3">
  <FeatureLink href="/soluciones" icon={Layers3} eyebrow="Organización" title="Módulos independientes" description="Accede a cada área de trabajo desde su propia sección."/>
  <FeatureLink href="/seguridad" icon={LockKeyhole} eyebrow="Acceso" title="Roles y empresas" description="La aplicación diferencia usuarios, permisos y el contexto de cada empresa."/>
  <FeatureLink href="/contacto" icon={Smartphone} eyebrow="Experiencia" title="Uso en teléfonos" description="Diseño adaptable para navegar también desde una PWA instalada."/>
 </div>
 <div className="rounded-[28px] border border-[#e6dfd1] bg-[#f8f5ef] p-6 sm:p-10"><div className="flex items-center gap-3"><Building2 className="size-6 text-primary"/><h2 className="text-2xl font-bold">Del registro al control diario</h2></div><p className="mt-4 max-w-3xl leading-8 text-muted-foreground">Trabaja con registros de finca, fichas individuales de animales y jornadas operativas. Los datos de cada empresa se consultan desde su espacio privado, de acuerdo con los permisos asignados.</p><Button asChild className="mt-6"><Link href="/login">Ir al software <ArrowRight className="size-4"/></Link></Button></div>
 </section></>; }
