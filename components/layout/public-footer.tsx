import Link from "next/link";

import { publicNavigation } from "@/lib/public-navigation";

export function PublicFooter() {
  return (
    <footer className="mt-auto border-t border-[#e9e5dd] bg-[#17201b] text-white">
      <div className="container grid gap-10 px-5 py-12 sm:px-6 md:grid-cols-[1.3fr_1fr]">
        <div className="max-w-md space-y-3">
          <p className="text-2xl font-bold tracking-tight">Ganad<span className="text-[#c9a15b]">IA</span></p>
          <p className="text-sm font-medium text-white/90">Tu finca, gestión inteligente.</p>
          <p className="text-sm leading-7 text-white/65">
            Una plataforma para organizar la información de tus fincas, el ganado y las jornadas de campo.
          </p>
        </div>
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#c9a15b]">Explorar</p>
          <nav aria-label="Navegación de pie de página" className="grid grid-cols-2 gap-x-4 gap-y-3">
            {publicNavigation.map((item) => (
              <Link key={item.href} href={item.href} className="w-fit text-sm text-white/80 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c9a15b]">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container flex flex-col gap-2 px-5 py-5 text-xs text-white/55 sm:flex-row sm:justify-between sm:px-6">
          <span>© {new Date().getFullYear()} GanadIA</span>
          <span>Plataforma tecnológica de Trends172Tech.</span>
        </div>
      </div>
    </footer>
  );
}
