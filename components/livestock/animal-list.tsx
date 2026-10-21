"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search, SlidersHorizontal, X } from "lucide-react";
import { formatAnimalInventoryAge, sortAnimalInventory, type AnimalInventorySortMode } from "@/lib/livestock/animal-inventory-sort";

import { Input } from "@/components/ui/input";

type AnimalRow = {
  id: string;
  internalCode: string;
  birthDate: string | null;
  estimatedAgeMonths: number | null;
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

function formatWeight(value: string | null) {
  if (!value) return "Sin registrar";
  const number = Number(value.replace(",", "."));
  return Number.isFinite(number)
    ? new Intl.NumberFormat("es-VE", { maximumFractionDigits: 2 }).format(number) + " kg"
    : value + " kg";
}

export function AnimalList({ animals }: AnimalListProps) {
  const [query, setQuery] = useState("");
  const [farmName, setFarmName] = useState("all");
  const [health, setHealth] = useState("all");
  const [sex, setSex] = useState("all");
  const [sort, setSort] = useState<AnimalInventorySortMode>("age-desc");
  const [page, setPage] = useState(1);
  const todayIso = new Date().toISOString().slice(0, 10);
  const pageSize = 25;

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

  const ordered = useMemo(() => sortAnimalInventory(filtered, sort, todayIso), [filtered, sort, todayIso]);
  const pages = Math.max(1, Math.ceil(ordered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const visible = ordered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const jumpToFirst = () => setPage(1);
  const hasFilters = Boolean(query.trim()) || farmName !== "all" || health !== "all" || sex !== "all";
  const reset = () => { setQuery(""); setFarmName("all"); setHealth("all"); setSex("all"); setPage(1); };

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
            onChange={(event) => { setQuery(event.target.value); jumpToFirst(); }}
            placeholder="Código, chapeta, raza o finca..."
            className="h-12 border-[#dfe6dd] bg-[#fafbf9] pl-11"
          />
        </label>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <label className="min-w-0 space-y-1">
            <span className="text-[11px] font-semibold text-[#78877b]">Finca</span>
            <select className={selectClass} aria-label="Filtrar por finca" value={farmName} onChange={(event) => { setFarmName(event.target.value); jumpToFirst(); }}>
              <option value="all">Todas las fincas</option>
              {farms.map((farm) => <option key={farm} value={farm}>{farm}</option>)}
            </select>
          </label>
          <label className="min-w-0 space-y-1">
            <span className="text-[11px] font-semibold text-[#78877b]">Sanidad</span>
            <select className={selectClass} aria-label="Filtrar por salud" value={health} onChange={(event) => { setHealth(event.target.value); jumpToFirst(); }}>
              <option value="all">Todos los estados</option>
              {Object.entries(healthLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="min-w-0 space-y-1">
            <span className="text-[11px] font-semibold text-[#78877b]">Sexo</span>
            <select className={selectClass} aria-label="Filtrar por sexo" value={sex} onChange={(event) => { setSex(event.target.value); jumpToFirst(); }}>
              <option value="all">Todos</option>
              <option value="FEMALE">Hembras</option>
              <option value="MALE">Machos</option>
              <option value="UNKNOWN">Sin definir</option>
            </select>
          </label>
        </div>
        <label className="mt-3 block max-w-sm space-y-1">
          <span className="text-[11px] font-semibold text-[#78877b]">Ordenar inventario</span>
          <select className={selectClass} value={sort} aria-label="Ordenar ganado"
            onChange={(event) => { setSort(event.target.value as AnimalInventorySortMode); jumpToFirst(); }}>
            <option value="age-desc">Edad: mayor a menor</option>
            <option value="age-asc">Edad: menor a mayor</option>
            <option value="code-asc">Código: ascendente</option>
            <option value="code-desc">Código: descendente</option>
          </select>
        </label>
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
        <div className="space-y-3">
          <div className="overflow-hidden rounded-[22px] border border-[#e1e8de] bg-white">
            <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,.7fr)_auto] gap-3 border-b bg-[#f1f5ef] px-4 py-3 text-xs font-bold text-[#54705d] md:grid">
              <span>Código / identificación</span><span>Edad / sexo</span><span>Finca / raza</span><span>Peso</span><span>Ficha</span>
            </div>
            <div className="divide-y divide-[#e8eee7]">
              {visible.map((animal) => (
                <article key={animal.id} className="grid gap-3 p-3 sm:p-4 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,.7fr)_auto] md:items-center">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-extrabold tracking-tight text-[#203b2b]">{animal.internalCode}</p>
                    <p className="mt-1 truncate text-xs text-[#7a887e]">{animal.visualIdentification || animal.speciesName}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm md:block">
                    <strong className="text-[#294830]">{formatAnimalInventoryAge(animal, todayIso)}</strong>
                    <span className="text-xs text-[#78877b] md:mt-1 md:block">{animal.sex === "FEMALE" ? "Hembra" : animal.sex === "MALE" ? "Macho" : "Sexo sin definir"}</span>
                  </div>
                  <div className="min-w-0 text-xs">
                    <p className="truncate font-semibold text-[#38533e]">{animal.farmName}</p>
                    <p className="mt-1 truncate text-[#77867b]">{animal.speciesName}{animal.breedName ? " · " + animal.breedName : ""}</p>
                  </div>
                  <p className="text-sm font-bold tabular-nums text-[#294830]">{formatWeight(animal.currentWeightKg)}</p>
                  <Link href={`/livestock/${encodeURIComponent(animal.id)}`}
                    aria-label={`Ver ganado ${animal.internalCode}`}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#f1e9dc] px-4 text-sm font-bold text-[#785b30] hover:bg-[#e5d8c4]">
                    Ver ganado <ArrowUpRight className="size-4" aria-hidden={true}/>
                  </Link>
                </article>
              ))}
            </div>
          </div>
          <nav aria-label="Páginas de ganado" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-3 text-sm">
            <span className="text-[#697b6e]">Mostrando {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, ordered.length)} de {ordered.length}</span>
            <div className="flex items-center gap-2">
              <button type="button" disabled={currentPage === 1} onClick={() => setPage(p => Math.max(1, p - 1))}
                className="min-h-11 rounded-xl border px-3 font-semibold disabled:opacity-40">Anterior</button>
              <span className="font-bold tabular-nums">{currentPage} / {pages}</span>
              <button type="button" disabled={currentPage === pages} onClick={() => setPage(p => Math.min(pages, p + 1))}
                className="min-h-11 rounded-xl border px-3 font-semibold disabled:opacity-40">Siguiente</button>
            </div>
          </nav>
        </div>
      )}
    </section>
  );
}
