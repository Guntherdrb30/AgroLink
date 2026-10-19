import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" aria-label="GanadIA - Inicio" className="inline-flex min-w-0 items-center gap-2.5">
      <img src="/logo/ganadia-icon.svg" alt="" aria-hidden="true" width="48" height="48" className="size-11 shrink-0" />
      <span className="flex min-w-0 flex-col">
        <span className="text-xl font-extrabold leading-none tracking-tight text-[#9B6D1C]">GanadIA</span>
        <span className="mt-1 text-[10px] font-medium leading-tight text-[#9B6D1C] sm:text-xs">Tu finca, gestión inteligente.</span>
      </span>
    </Link>
  );
}
