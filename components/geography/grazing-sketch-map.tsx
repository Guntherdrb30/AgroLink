"use client";

import { useEffect, useRef, useState } from "react";
import { Crosshair, MapPinned } from "lucide-react";
import { createPaddockSketch, type LocationPoint } from "@/lib/geography/paddock-sketch";
import { type GeoRing } from "@/lib/geography/farm-geometry";

type Geometry = { ring: GeoRing; name: string };
type Props = {
  geometry: Geometry | null;
  latitude: number | null;
  longitude: number | null;
  paddocks: number;
  facilities: LocationPoint[];
  onAddFacility?: (kind: LocationPoint["kind"], lat: number, lng: number) => void;
};
type LeafletMap = any;

const kindLabels: Record<LocationPoint["kind"], string> = {
  HOUSE: "Casa", CORRAL: "Corral", WATER: "Agua", ACCESS: "Acceso",
};
const leafletCss = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const leafletIntegrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";

export function GrazingSketchMap({ geometry, latitude, longitude, paddocks, facilities, onAddFacility }: Props) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [mark, setMark] = useState<LocationPoint["kind"] | null>(null);
  const [mapActive, setMapActive] = useState(false);
  const canvas = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap>(null);
  const overlays = useRef<LeafletMap>(null);
  const leaflet = useRef<LeafletMap>(null);
  const latest = useRef({ mark, onAddFacility });
  latest.current = { mark, onAddFacility };
  const hasLocation = Boolean(geometry) ||
    (latitude !== null && longitude !== null &&
    Number.isFinite(latitude) && Number.isFinite(longitude));

  useEffect(() => {
    if (!mapActive || !canvas.current || map.current) return;
    let live = true;
    (async () => {
      if (!(window as any).L) {
        let script = document.querySelector<HTMLScriptElement>('script[data-ganadia-leaflet="1"]');
        if (!script) {
          script = document.createElement("script");
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
          script.crossOrigin = "anonymous";
          script.dataset.ganadiaLeaflet = "1";
          document.head.appendChild(script);
        }
        await new Promise<void>((resolve, reject) => {
          if ((window as any).L) { resolve(); return; }
          script!.addEventListener("load", () => resolve(), { once: true });
          script!.addEventListener("error", () => reject(new Error("No se pudo cargar Leaflet.")), { once: true });
        });
      }
      if (!live || !canvas.current) return;
      const L = (window as any).L;
      leaflet.current = L;
      const first = geometry?.ring[0] ?? [longitude ?? -67, latitude ?? 8];
      const m = L.map(canvas.current, { zoomControl: true }).setView([first[1], first[0]], geometry ? 15 : 13);
      map.current = m;
      const tile = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(m);
      let tileFailures = 0;
      tile.on("tileerror", () => {
        tileFailures++;
        if (tileFailures > 4) setError("Algunas imágenes del mapa no cargaron. Revisa la conexión y vuelve a abrir el visor.");
      });
      overlays.current = L.layerGroup().addTo(m);
      m.on("click", (event: any) => {
        const mode = latest.current.mark;
        if (mode && latest.current.onAddFacility) {
          latest.current.onAddFacility(mode, Number(event.latlng.lat.toFixed(7)), Number(event.latlng.lng.toFixed(7)));
          setMark(null);
        }
      });
      if (geometry?.ring.length) {
        m.fitBounds(geometry.ring.map(([lng, lat]) => [lat, lng]), { padding: [32, 32] });
      }
      m.whenReady(() => m.invalidateSize());
      requestAnimationFrame(() => m.invalidateSize());
    })().catch(e => { if (live) setError(e instanceof Error ? e.message : "No se pudo abrir el mapa"); });
    return () => {
      live = false;
      if (map.current) { map.current.remove(); map.current = null; }
    };
  }, [mapActive]);

  useEffect(() => {
    if (map.current && geometry?.ring?.length) {
      map.current.fitBounds(geometry.ring.map(([lng, lat]) => [lat, lng]), { padding: [28, 28] });
      map.current.invalidateSize();
    }
  }, [mapActive, geometry?.name, JSON.stringify(geometry?.ring)]);
  const sketch = geometry ? createPaddockSketch(geometry.ring, paddocks, facilities) : null;
  useEffect(() => {
    if (!map.current || !leaflet.current || !overlays.current) return;
    const L = leaflet.current, layer = overlays.current;
    layer.clearLayers();
    if (geometry) {
      L.polygon(geometry.ring.map(([lng, lat]) => [lat, lng]), {
        color: "#c69b52", weight: 4, fillOpacity: .06,
      }).bindTooltip("Límite de " + geometry.name).addTo(layer);
    }
    if (sketch) {
      for (const zone of sketch.zones) {
        L.polygon(zone.ring.map(([lng, lat]) => [lat, lng]), {
          color: "#2b704c", weight: 2, dashArray: "6 6", fillColor: "#62b07b", fillOpacity: .14,
        }).bindTooltip(zone.name + " · " + zone.areaHectares.toLocaleString("es-VE") + " ha").addTo(layer);
      }
    }
    for (const point of facilities) {
      const label = kindLabels[point.kind] + (point.label ? ": " + point.label : "");
      L.circleMarker([point.lat, point.lng], {
        radius: 8, color: point.kind === "WATER" ? "#177d9f" : "#9f6426",
        fillOpacity: .9, fillColor: point.kind === "WATER" ? "#48a7c4" : "#e8b56a",
      }).bindTooltip(label).addTo(layer);
    }
  }, [mapActive, geometry, sketch?.axis, sketch?.zones.length, JSON.stringify(facilities), paddocks]);

  return (
    <section className="rounded-[23px] border border-[#dce7dd] bg-white p-3 shadow-sm sm:p-4">
      <link rel="stylesheet" href={leafletCss} integrity={leafletIntegrity} crossOrigin="anonymous" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.15em] text-[#94733e]">Bosquejo geográfico</p>
          <h3 className="mt-1 text-base font-bold text-[#25402c]">Distribución orientativa</h3>
        </div>
        {sketch && <span className="rounded-full bg-[#e5f0e5] px-3 py-1 text-xs font-bold text-[#386649]">{sketch.zones.length} sectores simulados</span>}
      </div>
      {!hasLocation ? (
        <div className="mt-3 rounded-2xl bg-[#f3f6f0] p-6 text-center text-sm leading-6 text-[#697d6d]">
          Para ver un diseño espacial, primero registra las coordenadas GPS o dibuja una fundación en el mapa de la finca.
        </div>
      ) : (
        <>
          {!mapActive ? (
            <button type="button" onClick={() => { setError(""); setMapActive(true); }} className="mt-4 flex min-h-64 w-full flex-col items-center justify-center gap-3 rounded-2xl bg-[#ecf2e9] text-[#356045]">
              <MapPinned className="size-9"/><span className="text-sm font-bold">Activar mapa de propuesta</span>
              <span className="max-w-xs text-center text-xs leading-5">Cargará cartografía externa. Los puntos visibles pueden enviarse a OpenStreetMap.</span>
            </button>
          ) : <div ref={canvas} className="mt-4 h-[350px] w-full overflow-hidden rounded-2xl bg-[#e8eee7] sm:h-[450px]"/>}
          {mapActive && onAddFacility && (
            <div className="mt-3 flex flex-wrap gap-2">
              {(["HOUSE","CORRAL","WATER","ACCESS"] as const).map(kind => (
                <button key={kind} type="button" aria-pressed={mark === kind}
                  onClick={() => setMark(mark === kind ? null : kind)}
                  className={"inline-flex min-h-10 items-center gap-1 rounded-xl px-3 text-xs font-bold " +
                    (mark === kind ? "bg-[#214b32] text-white" : "border border-[#d9e2d7] bg-white text-[#416149]")}>
                  <Crosshair className="size-3.5"/> {kindLabels[kind]}
                </button>
              ))}
              <p className="w-full text-xs text-[#718174]">{mark ? "Toca en el mapa el sitio de " + kindLabels[mark].toLowerCase() + ".":"Selecciona el tipo de instalación y márcala en el mapa."}</p>
            </div>
          )}
          {error && <p role="alert" className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">{error}</p>}
        </>
      )}
      <div className="mt-3 space-y-2 text-xs leading-5 text-[#718075]">
        {sketch ? (
          <p>Esquema por franjas para polígonos convexos; orientación {sketch.axis === "latitude" ? "este-oeste" : "norte-sur"}. La línea de cercas es aproximada y se penalizan cortes próximos a casa o corral.</p>
        ) : (
          <p>Para dibujar sectores automáticos se necesita el polígono georreferenciado de una fundación y entre 2 y 20 divisiones. Los terrenos irregulares se revisan manualmente.</p>
        )}
        <p><strong>No es un plano de obra.</strong> Verifica acceso al agua, vías, topografía y áreas inundables antes de instalar cercas o mover animales.</p>
      </div>
    </section>
  );
}
