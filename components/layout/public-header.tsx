import Link from "next/link";

import { InstitutionalWhatsAppButton } from "@/components/shared/institutional-whatsapp-button";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";

const navigation = [
  { href: "/", label: "Inicio" },
  { href: "/#marketplace", label: "Marketplace" },
  { href: "/#producto", label: "Producto" },
  { href: "/login", label: "Acceso" },
];

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/92 backdrop-blur-xl">
      <div className="container flex h-20 items-center justify-between gap-6 px-6">
        <Logo />
        <nav className="hidden items-center gap-8 lg:flex">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <InstitutionalWhatsAppButton className="hidden md:inline-flex" />
          <Button asChild size="sm">
            <Link href="/login">Entrar</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
