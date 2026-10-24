"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ClipboardList,
  FileSpreadsheet,
  Globe2,
  LayoutDashboard,
  MoreHorizontal,
  PawPrint,
  Receipt,
  ShieldCheck,
  Users,
  Wallet,
  Stethoscope,
  Sprout,
  X,
} from "lucide-react";

type DashboardSidebarProps = {
  tenantName: string;
  tenantRole: string;
  platformRole: string | null;
  verificationEnabled: boolean;
};

const primaryItems = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/farms", label: "Fincas", icon: Sprout },
  { href: "/livestock", label: "Ganado", icon: PawPrint },
  { href: "/operations", label: "Jornadas", icon: ClipboardList },
  { href: "/ventas", label: "Ventas", icon: Receipt },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export function DashboardSidebar({
  tenantName,
  tenantRole,
  platformRole,
  verificationEnabled,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const canImport = ["TENANT_OWNER", "TENANT_ADMIN", "FARM_MANAGER"].includes(tenantRole);
  const canReview = ["ROOT", "PLATFORM_ADMIN"].includes(platformRole ?? "");
  const primary = tenantRole === "VETERINARIAN" ? [{ href: "/dashboard", label: "Inicio", icon: LayoutDashboard }, { href: "/veterinaria", label: "Sanidad", icon: Stethoscope }] : tenantRole === "ACCOUNTING" ? [{ href: "/dashboard", label: "Inicio", icon: LayoutDashboard }, { href: "/finanzas", label: "Finanzas", icon: Wallet }] : primaryItems;
  const secondary = [
    ...(["TENANT_OWNER", "TENANT_ADMIN"].includes(tenantRole) ? [{ href: "/equipo", label: "Equipo y accesos", icon: Users }] : []),
    ...(canImport ? [{ href: "/imports", label: "Importar Excel", icon: FileSpreadsheet }] : []),
    ...(verificationEnabled ? [{ href: "/verification", label: "Verificación", icon: ShieldCheck }] : []),
    ...(verificationEnabled && canReview
      ? [{ href: "/admin/verification", label: "Revisión de cuentas", icon: Building2 }]
      : []),
  ];
  const moreIsActive = secondary.some((item) => isActive(pathname, item.href));

  useEffect(() => {
    if (!moreOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMoreOpen(false);
        moreButtonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [moreOpen]);

  const closeMenu = () => setMoreOpen(false);

  return (
    <>
      <aside className="hidden h-dvh flex-col overflow-y-auto border-r border-[#263d32] bg-[#17251e] px-4 py-6 text-white lg:sticky lg:top-0 lg:flex">
        <Link
          href="/dashboard"
          aria-label="GanadIA, ir al inicio"
          className="inline-flex w-fit items-center rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d5b374]"
        >
          <Image
            src="/logo/ganadia-lockup.svg"
            alt="GanadIA. Tu finca, gestión inteligente."
            width={210}
            height={70}
            className="h-auto w-[210px]"
            priority
          />
        </Link>

        <div className="mt-7 rounded-[20px] border border-white/10 bg-white/[0.065] p-4">
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#d5b374]">
            <span className="size-1.5 rounded-full bg-[#d5b374]" />
            Empresa activa
          </span>
          <p className="mt-2 break-words text-base font-semibold leading-6 text-white">{tenantName}</p>
          <p className="mt-1 text-xs leading-5 text-white/55">Espacio privado de gestión</p>
        </div>

        <nav aria-label="Menú principal del panel" className="mt-8 flex flex-1 flex-col gap-1">
          <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.2em] text-white/45">Operación</p>
          {primary.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={
                  "flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d5b374] " +
                  (active
                    ? "bg-[#c5a161] text-[#17251e] shadow-[0_8px_22px_rgba(0,0,0,0.12)]"
                    : "text-white/75 hover:bg-white/10 hover:text-white")
                }
              >
                <Icon className="size-5 shrink-0" aria-hidden={true} />
                {item.label}
              </Link>
            );
          })}

          {secondary.length > 0 && (
            <>
              <p className="mb-3 mt-7 px-3 text-[11px] font-bold uppercase tracking-[0.2em] text-white/45">Herramientas</p>
              {secondary.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={
                      "flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d5b374] " +
                      (active ? "bg-[#c5a161] text-[#17251e]" : "text-white/75 hover:bg-white/10 hover:text-white")
                    }
                  >
                    <Icon className="size-5 shrink-0" aria-hidden={true} />
                    {item.label}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        <div className="mt-7 border-t border-white/10 pt-5">
          <Link href="/" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-white/65 transition-colors hover:bg-white/10 hover:text-white">
            <Globe2 className="size-5" aria-hidden={true} />
            Sitio público
          </Link>
          <p className="mt-3 px-4 text-xs text-white/40">GanadIA · Centro de operaciones</p>
        </div>
      </aside>

      <nav
        aria-label="Navegación principal móvil"
        className="fixed inset-x-0 bottom-0 z-40 flex min-h-[72px] items-stretch justify-around border-t border-[#e4e7df] bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_rgba(20,35,27,0.07)] backdrop-blur-xl lg:hidden"
      >
        {primary.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={
                "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-0.5 py-3 text-[10px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#9b773f] sm:text-xs " +
                (active ? "text-[#84602e]" : "text-[#747e77] hover:text-[#1d3025]")
              }
            >
              <span className={"flex size-9 items-center justify-center rounded-xl " + (active ? "bg-[#f3eadb]" : "")}>
                <Icon className="size-[21px]" aria-hidden={true} />
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
        <button
          ref={moreButtonRef}
          type="button"
          aria-label="Abrir más opciones"
          aria-expanded={moreOpen}
          aria-controls="ganadia-more-panel"
          onClick={() => setMoreOpen(true)}
          className={
            "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-0.5 py-3 text-[10px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#9b773f] sm:text-xs " +
            (moreOpen || moreIsActive ? "text-[#84602e]" : "text-[#747e77]")
          }
        >
          <span className={"flex size-9 items-center justify-center rounded-xl " + (moreOpen || moreIsActive ? "bg-[#f3eadb]" : "")}>
            <MoreHorizontal className="size-[22px]" aria-hidden={true} />
          </span>
          <span>Más</span>
        </button>
      </nav>

      {moreOpen && (
        <div id="ganadia-more-panel" className="fixed inset-0 z-50 flex items-end lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[#102018]/65"
            onClick={closeMenu}
            aria-label="Cerrar menú de más opciones"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="ganadia-more-title"
            className="relative w-full max-h-[85dvh] overflow-y-auto rounded-t-[30px] bg-white px-5 pb-[calc(1.75rem+env(safe-area-inset-bottom))] pt-4 shadow-2xl"
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[#d9dfd6]" aria-hidden={true} />
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 id="ganadia-more-title" className="text-xl font-bold text-[#192a21]">Más opciones</h2>
                <p className="mt-1 text-sm text-[#6f796f]">{tenantName}</p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => { closeMenu(); moreButtonRef.current?.focus(); }}
                aria-label="Cerrar"
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#f0f2ef] text-[#24362a] focus-visible:outline-2 focus-visible:outline-[#84602e]"
              >
                <X className="size-5" aria-hidden={true} />
              </button>
            </div>
            <div className="mt-6 space-y-2">
              {secondary.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMenu}
                    className="flex min-h-14 items-center gap-4 rounded-2xl border border-[#e8eae4] bg-[#fcfcfa] px-4 text-sm font-semibold text-[#27352d] transition-colors hover:bg-[#f5efdf]"
                  >
                    <Icon className="size-5 shrink-0 text-[#84602e]" aria-hidden={true} />
                    {item.label}
                  </Link>
                );
              })}
              <Link
                href="/"
                onClick={closeMenu}
                className="flex min-h-14 items-center gap-4 rounded-2xl border border-[#e8eae4] bg-[#fcfcfa] px-4 text-sm font-semibold text-[#27352d] transition-colors hover:bg-[#f5efdf]"
              >
                <Globe2 className="size-5 shrink-0 text-[#84602e]" aria-hidden={true} />
                Visitar sitio público
              </Link>
            </div>
            <p className="mt-6 text-xs leading-5 text-[#798279]">
              Tu perfil y el cierre de sesión están disponibles desde el avatar de la cabecera.
            </p>
          </section>
        </div>
      )}
    </>
  );
}
