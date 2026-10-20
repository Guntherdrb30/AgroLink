import type { Metadata } from "next";
import { Beef, ClipboardList, FileSpreadsheet, LandPlot, ShieldCheck } from "lucide-react";
import { MarketingPageIntro } from "@/components/marketing/marketing-page-intro";
import { FeatureLink } from "@/components/marketing/feature-link";
export const metadata: Metadata = { title: "Soluciones", description: "Módulos de GanadIA para fincas, ganado, operaciones de campo e importaciones." };
export default function SolucionesPage(){ return <>
 <MarketingPageIntro eyebrow="Soluciones" title="Herramientas para las tareas reales del campo." description="Cada módulo tiene funciones específicas dentro del panel privado de GanadIA. La disponibilidad depende del usuario, su rol y la configuración de su empresa."/>
 <section className="container grid gap-5 px-5 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-3">
  <FeatureLink href="/soluciones/fincas" icon={LandPlot} eyebrow="Gestión" title="Fincas" description="Registro, ubicación y administración de la información de cada finca."/>
  <FeatureLink href="/soluciones/ganado" icon={Beef} eyebrow="Inventario" title="Ganado" description="Ficha individual, identificación, sanidad y trazabilidad de animales."/>
  <FeatureLink href="/soluciones/jornadas" icon={ClipboardList} eyebrow="Campo" title="Jornadas" description="Planificación, planillas y resultados de labores ganaderas."/>
  <FeatureLink href="/login" icon={FileSpreadsheet} eyebrow="Datos" title="Importaciones" description="Acceso autenticado a las herramientas existentes de carga de información."/>
  <FeatureLink href="/seguridad" icon={ShieldCheck} eyebrow="Control" title="Permisos" description="Funciones y vistas diferenciadas según el rol del usuario."/>
 </section></>; }
