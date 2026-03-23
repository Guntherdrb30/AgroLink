const metrics = [
  { value: "Multi-tenant", label: "Arquitectura lista para varias empresas" },
  { value: "Marketplace", label: "Superficie publica comercial desde el inicio" },
  { value: "PWA Ready", label: "Instalacion preparada y soporte base offline" },
  { value: "WhatsApp", label: "Canal institucional visible para conversion" },
];

export function MarketplaceMetrics() {
  return (
    <section className="container px-6">
      <div className="grid gap-4 rounded-[32px] border border-border bg-card p-6 shadow-sm md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-[24px] bg-muted px-5 py-6">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
              {metric.value}
            </p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {metric.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
