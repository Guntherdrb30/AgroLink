import { InstitutionalWhatsAppButton } from "@/components/shared/institutional-whatsapp-button";
import { Logo } from "@/components/shared/logo";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="grid min-h-screen bg-transparent lg:grid-cols-[1.05fr_0.95fr]">
      <aside className="hidden border-r border-border/70 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(247,249,251,0.98)_100%)] p-10 lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center justify-between gap-4">
          <div className="rounded-full border border-border bg-background px-4 py-2 shadow-sm">
            <Logo />
          </div>
          <InstitutionalWhatsAppButton className="hidden xl:inline-flex" />
        </div>
        <div className="max-w-xl space-y-6">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Acceso institucional
          </p>
          <h1 className="text-5xl font-semibold leading-tight text-balance">
            Gestion sobria para un producto agropecuario serio.
          </h1>
          <p className="text-base leading-8 text-muted-foreground">
            El acceso de AgroLynk esta preparado para multiples empresas, multiples roles,
            Google como metodo adicional y una experiencia lista para evolucionar
            a onboarding, verificacion y soporte.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[28px] border border-border bg-card p-6 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">
              Capa publica
            </p>
            <p className="mt-2 text-lg font-semibold">
              Mercado verificado y catalogos comerciales.
            </p>
          </div>
          <div className="rounded-[28px] border border-border bg-card p-6 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">
              Capa privada
            </p>
            <p className="mt-2 text-lg font-semibold">
              Panel SaaS con foco en operacion por empresa.
            </p>
          </div>
        </div>
      </aside>
      <main className="flex items-center justify-center px-6 py-12">{children}</main>
    </div>
  );
}
