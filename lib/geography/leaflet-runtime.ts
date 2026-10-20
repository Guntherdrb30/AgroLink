/**
 * Small typed interface over Leaflet 1.9.4 loaded on demand from its public CDN.
 * Keep the dependency out of SSR and avoid untyped interop in map components.
 */
export type LeafletMouseEvent = { latlng: { lat: number; lng: number } };
export type LeafletLayerGroup = {
  clearLayers(): void;
  addTo(map: LeafletMap): LeafletLayerGroup;
};
export type LeafletLayer = {
  addTo(mapOrGroup: LeafletMap | LeafletLayerGroup): LeafletLayer;
  bindTooltip(content: string): LeafletLayer;
  on(event: string, callback: (event: LeafletMouseEvent) => void): LeafletLayer;
};
export type LeafletMap = {
  remove(): void;
  invalidateSize(): void;
  setView(coordinates: number[], zoom: number): LeafletMap;
  fitBounds(coordinates: number[][], options?: { padding?: number[] }): LeafletMap;
  on(event: string, callback: (event: LeafletMouseEvent) => void): LeafletMap;
  whenReady(callback: () => void): LeafletMap;
};
export type LeafletRuntime = {
  map(container: HTMLElement, options?: Record<string, unknown>): LeafletMap;
  tileLayer(url: string, options?: Record<string, unknown>): LeafletLayer;
  layerGroup(): LeafletLayerGroup;
  polygon(points: number[][], options?: Record<string, unknown>): LeafletLayer;
  polyline(points: number[][], options?: Record<string, unknown>): LeafletLayer;
  circleMarker(coordinates: number[], options?: Record<string, unknown>): LeafletLayer;
  DomEvent: { stopPropagation(event: unknown): void };
};
declare global {
  interface Window {
    L?: LeafletRuntime;
  }
}

const LEAFLET_SRC = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const SCRIPT_INTEGRITY = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
let pending: Promise<LeafletRuntime> | null = null;

export function loadLeaflet(): Promise<LeafletRuntime> {
  if (typeof window === "undefined") return Promise.reject(new Error("Mapa no disponible en el servidor"));
  if (window.L) return Promise.resolve(window.L);
  if (pending) return pending;
  pending = new Promise<LeafletRuntime>((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>('script[data-ganadia-leaflet="1"]');
    if (!script) {
      script = document.createElement("script");
      script.src = LEAFLET_SRC;
      script.integrity = SCRIPT_INTEGRITY;
      script.crossOrigin = "anonymous";
      script.dataset.ganadiaLeaflet = "1";
    }
    const runningScript = script;
    const onReady = () => {
      if (window.L) resolve(window.L);
      else reject(new Error("Leaflet no está disponible."));
    };
    const onError = () => reject(new Error("No fue posible descargar los mapas. Comprueba la conexión."));
    runningScript.addEventListener("load", onReady, { once: true });
    runningScript.addEventListener("error", onError, { once: true });
    if (!runningScript.isConnected) document.head.appendChild(runningScript);
    if (window.L) onReady();
  }).catch(error => {
    pending = null;
    const broken = document.querySelector<HTMLScriptElement>('script[data-ganadia-leaflet="1"]');
    if (broken) broken.remove();
    throw error;
  });
  return pending;
}
