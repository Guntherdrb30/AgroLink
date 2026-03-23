export function PublicFooter() {
  return (
    <footer className="mt-16 border-t border-border/70 bg-white">
      <div className="container grid gap-8 px-6 py-12 md:grid-cols-[1.3fr_0.7fr_0.7fr]">
        <div className="space-y-3">
          <p className="text-lg font-semibold">AgroLynk</p>
          <p className="max-w-lg text-sm leading-7 text-muted-foreground">
            Plataforma SaaS multitenant para fincas, marketplace verificado,
            operacion de campo y gestion agropecuaria corporativa.
          </p>
        </div>
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Producto
          </p>
          <p className="text-sm text-foreground">Dashboard SaaS</p>
          <p className="text-sm text-foreground">Marketplace publico</p>
          <p className="text-sm text-foreground">PWA preparada</p>
        </div>
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Operacion
          </p>
          <p className="text-sm text-foreground">Auth.js + Prisma</p>
          <p className="text-sm text-foreground">Storage en Vercel Blob</p>
          <p className="text-sm text-foreground">Base lista para modulos</p>
        </div>
      </div>
    </footer>
  );
}
