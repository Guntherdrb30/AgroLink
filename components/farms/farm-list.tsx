"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, LandPlot, MapPin, Search, SlidersHorizontal, Sprout } from "lucide-react";
import type { VerificationStatus } from "@prisma/client";

import { Input } from "@/components/ui/input";
import { VerificationBadge } from "@/components/shared/verification-badge";

export type FarmSummary = {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  hectares: string | null;
  imageUrl: string | null;
  logoUrl: string | null;
  status: string;
  verificationStatus: VerificationStatus;
};

type FarmListProps = {
  farms: FarmSummary[];
  verificationRequired: boolean;
  canEdit: boolean;
};

function FarmCover({ farm }: { farm: FarmSummary }) {
  const [imageError, setImageError] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const showImage = Boolean(farm.imageUrl?.startsWith("/api/farm-media/")) && !imageError;
  const showLogo = Boolean(farm.logoUrl?.startsWith("/api/farm-media/")) && !logoError;

  return (
    <div className="relative aspect-[16/9] overflow-hidden bg-[linear-gradient(135deg,#193e2b,#446b4a)]">
      {showImage ? (
        // Authenticated, same-origin endpoint; private Blob provider URLs are never exposed.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={farm.imageUrl!}
          alt={`Fotografía de ${farm.name}`}
          loading="lazy"
          decoding="async"
          onError={() => setImageError(true)}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-white/80">
          <LandPlot className="size-12 stroke-[1.1] text-[#d5b374]" aria-hidden={true} />
          <p className="text-xs font-medium tracking-[0.1em] text-white/65">Tu espacio de campo</p>
        </div>
      )}
      <span className="absolute bottom-3 left-3 rounded-full border border-white/20 bg-[#172d20]/85 px-3 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur">
        {farm.location || "Ubicación pendiente"}
      </span>
      {showLogo ? (
        <span className="absolute right-3 top-3 flex size-12 items-center justify-center overflow-hidden rounded-2xl border-2 border-white/80 bg-white shadow-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={farm.logoUrl!} alt={`Logo de ${farm.name}`} loading="lazy" onError={() => setLogoError(true)} className="h-full w-full object-contain" />
        </span>
      ) : null}
    </div>
  );
}

function formatHectares(value: string | null) {
  if (!value) return "No especificada";
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed)) return "No especificada";
  return new Intl.NumberFormat("es-VE", { maximumFractionDigits: 2 }).format(parsed) + " ha";
}

export function FarmList({ farms, verificationRequired, canEdit }: FarmListProps) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "name">("recent");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    const items = farms.filter((farm) =>
      !normalized || [farm.name, farm.location, farm.description]
        .some((part) => part?.toLocaleLowerCase("es").includes(normalized)),
    );
    if (sortBy === "name") items.sort((a, b) => a.name.localeCompare(b.name, "es"));
    return items;
  }, [farms, query, sortBy]);

  if (farms.length === 0) {
    return (
      <section className="rounded-[26px] border border-dashed border-[#cdd7ca] bg-white px-6 py-10 text-center shadow-sm">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#f2ecdf] text-[#8d6b3c]">
          <Sprout className="size-7" aria-hidden={true} />
        </div>
        <h2 className="mt-4 text-lg font-bold text-[#1e3025]">Todavía no hay fincas registradas</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-[#69766f]">
          {canEdit
            ? "Completa el formulario de arriba para registrar tu primera finca y comenzar a organizar su información."
            : "Las fincas de tu empresa aparecerán aquí cuando un usuario autorizado las registre."}
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-5" aria-labelledby="farm-gallery-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#997943]">Tu territorio</p>
          <h2 id="farm-gallery-title" className="mt-1 text-xl font-bold tracking-tight text-[#1b3023] sm:text-2xl">Fincas registradas</h2>
          <p className="mt-1 text-xs text-[#6e7b72]">{farms.length} {farms.length === 1 ? "finca" : "fincas"} en tu empresa</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <label className="relative block">
          <span className="sr-only">Buscar fincas por nombre o ubicación</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#849188]" aria-hidden={true}/>
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre o ubicación"
            className="h-12 bg-white pl-12"
          />
        </label>
        <label className="flex h-12 items-center gap-2 rounded-2xl border border-[#dde4da] bg-white px-3 text-sm text-[#617063]">
          <SlidersHorizontal className="size-4 shrink-0" aria-hidden={true}/>
          <span className="sr-only">Ordenar fincas</span>
          <select
            className="h-full min-w-0 flex-1 cursor-pointer bg-transparent text-sm font-medium text-[#304435] outline-none sm:flex-none"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value === "name" ? "name" : "recent")}
            aria-label="Ordenar fincas"
          >
            <option value="recent">Más recientes</option>
            <option value="name">Nombre (A-Z)</option>
          </select>
        </label>
      </div>

      <p className="sr-only" aria-live="polite">{filtered.length} resultados</p>
      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-[#e3e8e1] bg-white px-5 py-10 text-center">
          <p className="font-semibold text-[#253a2b]">No hay coincidencias</p>
          <p className="mt-1 text-sm text-[#76837a]">Prueba con otro nombre o una ubicación diferente.</p>
          <button type="button" onClick={() => setQuery("")} className="mt-4 rounded-xl px-4 py-2 text-sm font-semibold text-[#876633] hover:bg-[#f5efdf]">Limpiar búsqueda</button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((farm) => (
            <article key={farm.id} className="group min-w-0 overflow-hidden rounded-[25px] border border-[#e0e7df] bg-white shadow-[0_8px_28px_rgba(20,35,25,0.05)] transition-shadow hover:shadow-[0_14px_40px_rgba(20,35,25,0.12)]">
              <FarmCover farm={farm} />
              <div className="space-y-4 p-4 sm:p-5">
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <h3 className="min-w-0 break-words text-lg font-bold tracking-tight text-[#203528]">{farm.name}</h3>
                  {verificationRequired ? (
                    <VerificationBadge status={farm.verificationStatus} />
                  ) : (
                    <span className="shrink-0 rounded-full bg-[#eff4ec] px-2.5 py-1 text-[10px] font-semibold text-[#47654a]">Registrada</span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 text-sm text-[#66756a]">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-4" aria-hidden={true}/> Superficie
                  </span>
                  <strong className="text-sm text-[#2b4233]">{formatHectares(farm.hectares)}</strong>
                </div>
                <Link
                  href={`/farms/${encodeURIComponent(farm.id)}`}
                  className="flex min-h-11 items-center justify-between rounded-2xl bg-[#f5f3ed] px-4 text-sm font-bold text-[#765c30] transition-colors hover:bg-[#ebe0c8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9b773f]"
                >
                  {canEdit ? "Administrar finca" : "Ver finca"}
                  <ArrowRight className="size-4" aria-hidden={true}/>
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
