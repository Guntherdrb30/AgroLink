import { MarketplaceHero } from "@/components/marketplace/marketplace-hero";
import { MarketplaceMetrics } from "@/components/marketplace/marketplace-metrics";
import { MarketplacePreview } from "@/components/marketplace/marketplace-preview";
import { MarketplaceSolutions } from "@/components/marketplace/marketplace-solutions";
import { PageHeader } from "@/components/shared/page-header";

export default function PublicHomePage() {
  return (
    <div className="space-y-16 pb-20">
      <MarketplaceHero />
      <MarketplaceMetrics />
      <section id="marketplace" className="container space-y-8 px-6">
        <PageHeader
          eyebrow="Marketplace"
          title="Una home pensada para publicar, descubrir y convertir."
          description="La capa publica combina confianza institucional, fichas verificadas y contacto comercial listo para WhatsApp."
        />
        <MarketplacePreview />
      </section>
      <section id="producto" className="container space-y-8 px-6">
        <PageHeader
          eyebrow="Producto"
          title="La experiencia privada del SaaS queda alineada con la operacion real."
          description="Desde el inicio la interfaz separa acceso, dashboard y marketplace para escalar producto sin rehacer navegacion."
        />
        <MarketplaceSolutions />
      </section>
    </div>
  );
}
