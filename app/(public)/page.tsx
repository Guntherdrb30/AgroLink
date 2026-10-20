import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Beef, ClipboardList, MapPinned, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeatureLink } from "@/components/marketing/feature-link";
export const metadata: Metadata = { title: "Inicio", description: "GanadIA: tu finca, gestión inteligente. Centraliza fincas, ganado y jornadas de campo." };
export default function HomePage() {
 return <div>
  <section className="bg-[linear-gradient(125deg,#17201b_0%,#28362a_65%,#534225_100%)] text-white">
   <div className="container grid gap-12 px-5 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
    <div className="space-y-7">
     <p className="text-xs font-bold uppercase tracking-[0.23em] text-[#e0ba71]">GanadIA · Plataforma agropecuaria</p>
     <h1 className="max-w-2xl text-4xl font-extrabold leading-[1.07] tracking-tight sm:text-6xl">Tu finca, <span className="text-[#e0ba71]">gestión inteligente.</span></h1>
     <p className="max-w-xl text-base leading-8 text-white/80 sm:text-lg">Organiza tus fincas, controla tu ganado y registra las jornadas de campo desde un entorno de trabajo diseñado para operaciones agropecuarias.</p>
     <div className="flex flex-wrap gap-3">
      <Button asChild size="lg" className="bg-[#b58b45] text-white hover:bg-[#977137]"><Link href="/login">Entrar a GanadIA <ArrowRight className="size-4" /></Link></Button>
      <Button asChild size="lg" variant="outline" className="border-white/35 bg-transparent text-white hover:bg-white/10 hover:text-white"><Link href="/plataforma">Conocer la plataforma</Link></Button>
     </div>
    </div>
    <div className="rounded-[32px] border border-white/15 bg-white/10 p-7 shadow-2xl backdrop-blur-sm sm:p-9">
     <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#e0ba71]">Una operación conectada</p>
     <div className="mt-6 grid gap-3">
      {[["01","Registra y organiza tus fincas"],["02","Consulta el inventario y las fichas de ganado"],["03","Planifica jornadas y conserva la trazabilidad"]].map(([n,t])=><div key={n} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/15 p-4"><span className="text-xl font-bold text-[#e0ba71]">{n}</span><p className="text-sm font-medium leading-6 text-white/90">{t}</p></div>)}
     </div>
    </div>
   </div>
  </section>
  <section className="container space-y-8 px-5 py-16 sm:px-6 sm:py-20">
   <div className="max-w-3xl space-y-3"><p className="text-xs font-bold uppercase tracking-widest text-[#84662f]">Explora GanadIA</p><h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Cada área tiene su espacio.</h2><p className="text-base leading-7 text-muted-foreground">Navega por páginas independientes y descubre las capacidades del sistema sin recorrer una landing interminable.</p></div>
   <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
    <FeatureLink href="/plataforma" eyebrow="Software" title="Plataforma" description="Conoce el sistema y su organización por empresas." icon={MapPinned}/>
    <FeatureLink href="/soluciones" eyebrow="Módulos" title="Soluciones" description="Fincas, control ganadero y jornadas de campo." icon={Beef}/>
    <FeatureLink href="/mercado" eyebrow="Ecosistema" title="Mercado" description="Consulta el alcance de la capa comercial." icon={ClipboardList}/>
    <FeatureLink href="/seguridad" eyebrow="Acceso" title="Confianza" description="Aislamiento de empresas, roles y seguridad." icon={ShieldCheck}/>
   </div>
  </section>
 </div>;
}