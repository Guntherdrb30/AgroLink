const metrics = [
  {
    value: "Cuentas verificadas",
    label: "Confianza institucional para operar y publicar en la plataforma.",
  },
  {
    value: "Control por animal",
    label: "Pesos, sanidad, genealogia y timeline en una sola ficha maestra.",
  },
  {
    value: "Trabajo offline",
    label: "Planillas PDF y Excel oficiales para jornadas reales de campo.",
  },
  {
    value: "Canal comercial",
    label: "Marketplace y WhatsApp integrados para visibilidad y conversion.",
  },
];

export function MarketplaceMetrics() {
  return (
    <section className="container px-6">
      <div className="grid gap-4 rounded-[36px] border border-border/70 bg-white p-4 shadow-[0_18px_50px_rgba(31,41,51,0.05)] md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.value}
            className="rounded-[28px] bg-[linear-gradient(180deg,#fbfcfd_0%,#f2f5f7_100%)] px-5 py-6"
          >
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
