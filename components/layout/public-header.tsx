"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { isPublicRouteActive, publicNavigation } from "@/lib/public-navigation";

export function PublicHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-[#dedbd3] bg-white/95 backdrop-blur-xl">
      <div className="container flex h-[76px] items-center justify-between gap-3 px-4 sm:h-[88px] sm:px-6">
        <Logo />

        <nav aria-label="Navegación principal" className="hidden items-center gap-1 lg:flex">
          {publicNavigation.map((item) => {
            const active = isPublicRouteActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                className={`rounded-full px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${active ? "bg-[#f3eee4] text-[#70572f]" : "text-[#47515b] hover:bg-[#f7f5f0] hover:text-foreground"}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Button asChild size="sm">
            <Link href="/login">Entrar</Link>
          </Button>
          <button
            ref={toggleRef}
            type="button"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-controls="ganadia-mobile-navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-white text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:hidden"
          >
            {menuOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      <nav
        id="ganadia-mobile-navigation"
        aria-label="Navegación móvil"
        hidden={!menuOpen}
        className="absolute inset-x-0 top-full border-b border-[#dedbd3] bg-white px-4 py-3 shadow-xl lg:hidden"
      >
        <div className="container grid gap-1">
          {publicNavigation.map((item) => {
            const active = isPublicRouteActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
                className={`rounded-xl px-4 py-3 text-base font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${active ? "bg-[#f3eee4] text-[#70572f]" : "text-foreground hover:bg-muted"}`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
