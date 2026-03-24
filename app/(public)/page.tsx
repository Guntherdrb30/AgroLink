import { MarketplaceCommercialCta } from "@/components/marketplace/marketplace-commercial-cta";
import { MarketplaceHero } from "@/components/marketplace/marketplace-hero";
import { MarketplaceMetrics } from "@/components/marketplace/marketplace-metrics";
import { MarketplacePreview } from "@/components/marketplace/marketplace-preview";
import { MarketplaceSolutions } from "@/components/marketplace/marketplace-solutions";
import { MarketplaceTestimonials } from "@/components/marketplace/marketplace-testimonials";
import { PageHeader } from "@/components/shared/page-header";

export default function PublicHomePage() {
  return (
    <div className="space-y-18 pb-24">
      <MarketplaceHero />
      <MarketplaceMetrics />

      <section id="marketplace" className="container space-y-8 px-6">
        <PageHeader
          eyebrow="Como funciona"
          title="Una portada publica que explica el sistema sin abrumar al usuario."
          description="La home debe transmitir orden, respaldo y claridad comercial desde el primer recorrido. Por eso AgroLynk se presenta como un flujo visible: verificar, operar y crecer."
        />
        <MarketplacePreview />
      </section>

      <MarketplaceTestimonials />

      <section id="producto" className="container space-y-8 px-6">
        <PageHeader
          eyebrow="Modulos clave"
          title="Una plataforma pensada para el negocio agropecuario real."
          description="La base publica ya deja claro que el sistema no es solo una pagina comercial: es una herramienta completa para controlar operacion, datos y confianza de mercado."
        />
        <MarketplaceSolutions />
      </section>

      <MarketplaceCommercialCta />
    </div>
  );
}
