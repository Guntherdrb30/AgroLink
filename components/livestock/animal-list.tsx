"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Beef, MapPin, Search, Scale, SlidersHorizontal, X } from "lucide-react";

import { Input } from "@/components/ui/input";

type AnimalRow = {
  id: string;
  internalCode: string;
  visualIdentification: string | null;
  speciesName: string;
  breedName: string | null;
  sex: string;
  farmName: string;
  lotOrZone: string | null;
  productiveLine: string;
  currentWeightKg: string | null;
  healthStatus: string;
  reproductiveStatus: string;
  origin: string | null;
  photoUrl: string | null;
};

type AnimalListProps = { animals: AnimalRow[] };

const healthLabels: Record<string, string> = {
  HEALTHY: "Sano",
  UNDER_OBSERVATION: "En observación",
  SICK: "Enfermo",
  RECOVERING: "En recuperación",
  QUARANTINE: "En cuarentena",
};
const lineLabels: Record<string, string> = {
  BEEF: "Carne",
  DAIRY: "Leche",
  DUAL_PURPOSE: "Doble propósito",
  BREEDING: "Cría",
  WORK: "Trabajo",
  OTHER: "Otra línea",
};
const healthColors: Record<string, string> = {
  HEALTHY: "border-emerald-200 bg-emerald-50 text-emerald-800",
  UNDER_OBSERVATION: "border-amber-200 bg-amber-50 text-amber-800",
  SICK: "border-red-200 bg-red-50 text-red-800",
  RECOVERING: "border-sky-200 bg-sky-50 text-sky-800",
  QUARANTINE: "border-orange-200 bg-orange-50 text-orange-800",
};

function formatWeight(value: string | null) {
  if (!value) return "Sin registrar";
  const number = Number(value.replace(",", "."));
  return Number.isFinite(number)
    ? new Intl.NumberFormat("es-VE", { maximumFractionDigits: 2 }).format(number) + " kg"
    : value + " kg";
}

function AnimalPhoto({ animal }: { animal: AnimalRow }) {
  const [failed, setFailed] = useState(false);
  const displayPhoto = Boolean(animal.photoUrl?.startsWith("https://")) && !failed;
  return (
    <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden bg-[linear-gradient(135deg,#173b2b,#537053)]">
      {displayPhoto ? (
        // This image is a public livestock photo; private farm images are never used here.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={animal.photoUrl!}
          alt={`Animal ${animal.internalCode}`}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="flex flex-col items-center gap-2 text-white/75">
          <Beef className="size-12 text-[#dfc087]" strokeWidth={1.5} aria-hidden={true} />
          <span className="text-xs font-medium tracking-[0.12em]">GANADIA</span>
        </div>
      )}
      <span className="absolute bottom-3 left-3 max-w-[85%] truncate rounded-xl border border-white/15 bg-[#152b21]/85 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
        {animal.speciesName}
        {animal.breedName ? ` · ${animal.breedName}` : ""}
      </span>
    </div>
  );
}

export function AnimalList({ animals }: AnimalListProps) {
  const [query, setQuery] = useState("");
  const [farmName, setFarmName] = useState("all");
  const [health, setHealth] = useState("all");
  const [sex, setSex] = useState("all");

  const farms = useMemo(
    () => [...new Set(animals.map((animal) => animal.farmName))].sort((a, b) => a.localeCompare(b, "es")),
    [animals],
  );
  const filtered = useMemo(() => {
    const text = query.trim().toLocaleLowerCase("es");
    return animals.filter((animal) =>
      (!text || [
        animal.internalCode,
        animal.visualIdentification,
        animal.speciesName,
        animal.breedName,
        animal.farmName,
        animal.lotOrZone,
      ].some((value) => value?.toLocaleLowerCase("es").includes(text))) &&
      (farmName === "all" || animal.farmName === farmName) &&
      (health === "all" || animal.healthStatus === health) &&
      (sex === "all" || animal.sex === sex),
    );
  }, [animals, farmName, health, query, sex]);

  const hasFilters = Boolean(query.trim()) || farmName !== "all" || health !== "all" || sex !== "all";
  const reset = () => { setQuery(""); setFarmName("all"); setHealth("all"); setSex("all"); };

  if (animals.length === 0) return null;
  const selectClass = "min-h-11 min-w-0 w-full rounded-xl border border-[#dfe6dd] bg-white px-3 text-sm font-medium text-[#344939] outline-none focus-visible:ring-2 focus-visible:ring-[#a68651]";

  return (
    <section className="space-y-4" aria-labelledby="ganadia-livestock-inventory">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.17em] text-[#98753d]">Inventario</p>
          <h2 id="ganadia-livestock-inventory" className="mt-1 text-xl font-bold text-[#203529] sm:text-2xl">Mis animales</h2>
        </div>
        <p className="text-xs font-semibold text-[#7a887e]">{filtered.length} de {animals.length} registros</p>
      </div>

      <div className="rounded-[22px] border border-[#e1e8de] bg-white p-3 shadow-sm sm:p-4">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-[#809185]" aria-hidden={true} />
          <span className="sr-only">Buscar animales</span>
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Código, chapeta, raza o finca..."
            className="h-12 border-[#dfe6dd] bg-[#fafbf9] pl-11"
          />
        </label>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <label className="min-w-0 space-y-1">
            <span className="text-[11px] font-semibold text-[#78877b]">Finca</span>
            <select className={selectClass} aria-label="Filtrar por finca" value={farmName} onChange={(event) => setFarmName(event.target.value)}>
              <option value="all">Todas las fincas</option>
              {farms.map((farm) => <option key={farm} value={farm}>{farm}</option>)}
            </select>
          </label>
          <label className="min-w-0 space-y-1">
            <span className="text-[11px] font-semibold text-[#78877b]">Sanidad</span>
            <select className={selectClass} aria-label="Filtrar por salud" value={health} onChange={(event) => setHealth(event.target.value)}>
              <option value="all">Todos los estados</option>
              {Object.entries(healthLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="min-w-0 space-y-1">
            <span className="text-[11px] font-semibold text-[#78877b]">Sexo</span>
            <select className={selectClass} aria-label="Filtrar por sexo" value={sex} onChange={(event) => setSex(event.target.value)}>
              <option value="all">Todos</option>
              <option value="FEMALE">Hembras</option>
              <option value="MALE">Machos</option>
              <option value="UNKNOWN">Sin definir</option>
            </select>
          </label>
        </div>
        {hasFilters && (
          <button type="button" onClick={reset} className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-[#876735] hover:bg-[#f5eee1]">
            <X className="size-3.5" aria-hidden={true} /> Limpiar filtros
          </button>
        )}
      </div>

      <p role="status" aria-live="polite" className="sr-only">{filtered.length} animales encontrados</p>

      {filtered.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-[#ccd9ca] bg-white px-5 py-10 text-center">
          <SlidersHorizontal className="mx-auto size-9 text-[#98753d]" aria-hidden={true} />
          <p className="mt-3 text-base font-bold text-[#203529]">No hay coincidencias</p>
          <p className="mt-2 text-sm text-[#718076]">Prueba otra búsqueda o modifica los filtros.</p>
          <button type="button" onClick={reset} className="mt-4 rounded-full bg-[#f2eadc] px-5 py-2.5 text-sm font-bold text-[#755b30]">Mostrar todos</button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((animal) => (
            <article key={animal.id} className="group min-w-0 overflow-hidden rounded-[24px] border border-[#e1e8de] bg-white shadow-[0_9px_28px_rgba(16,38,22,0.055)] transition-all hover:border-[#b9a47c] hover:shadow-[0_15px_38px_rgba(16,38,22,0.11)]">
              <AnimalPhoto animal={animal} />
              <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="break-all text-lg font-bold tracking-tight text-[#1e3427]">{animal.internalCode}</h3>
                    <p className="mt-1 truncate text-xs text-[#77867b]">{animal.visualIdentification || "Sin identificación visual"}</p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${healthColors[animal.healthStatus] ?? "border-slate-200 bg-slate-50 text-slate-700"}`}>
                    {healthLabels[animal.healthStatus] ?? "Sin estado"}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 border-y border-[#edf0eb] py-4 text-xs">
                  <div className="min-w-0">
                    <span className="flex items-center gap-1 text-[#839087]"><MapPin className="size-3.5" aria-hidden={true} /> Finca</span>
                    <p className="mt-1 truncate font-semibold text-[#314939]">{animal.farmName}</p>
                  </div>
                  <div>
                    <span className="flex items-center gap-1 text-[#839087]"><Scale className="size-3.5" aria-hidden={true} /> Peso</span>
                    <p className="mt-1 font-semibold text-[#314939]">{formatWeight(animal.currentWeightKg)}</p>
                  </div>
                  <div>
                    <span className="text-[#839087]">Sexo</span>
                    <p className="mt-1 font-semibold text-[#314939]">{animal.sex === "FEMALE" ? "Hembra" : animal.sex === "MALE" ? "Macho" : "Sin definir"}</p>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[#839087]">Producción</span>
                    <p className="mt-1 truncate font-semibold text-[#314939]">{lineLabels[animal.productiveLine] || "Sin definir"}</p>
                  </div>
                </div>
                <Link href={`/livestock/${encodeURIComponent(animal.id)}`}
                  className="mt-4 flex min-h-11 items-center justify-between rounded-2xl bg-[#f4f1e9] px-4 text-sm font-bold text-[#74572a] transition-colors hover:bg-[#e9dfcc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#aa874e]">
                  Ver ficha completa <ArrowUpRight className="size-4" aria-hidden={true} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
