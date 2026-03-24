export function PublicFooter() {
  return (
    <footer id="contacto" className="mt-16 border-t border-border/70 bg-white">
      <div className="container grid gap-8 px-6 py-12 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
        <div className="space-y-3">
          <p className="text-lg font-semibold">AgroLynk</p>
          <p className="max-w-lg text-sm leading-7 text-muted-foreground">
            Plataforma SaaS multiempresa para fincas, mercado verificado,
            operacion de campo y gestion agropecuaria corporativa.
          </p>
          <p className="text-sm text-muted-foreground">
            Contacto institucional y despliegue comercial listos para lanzamiento.
          </p>
        </div>
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Producto
          </p>
          <p className="text-sm text-foreground">Panel SaaS</p>
          <p className="text-sm text-foreground">Mercado publico</p>
          <p className="text-sm text-foreground">PWA preparada</p>
        </div>
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Confianza
          </p>
          <p className="text-sm text-foreground">Verificacion documental</p>
          <p className="text-sm text-foreground">Trazabilidad operativa</p>
          <p className="text-sm text-foreground">Soporte comercial institucional</p>
        </div>
      </div>
    </footer>
  );
}
