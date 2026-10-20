"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Compass, Crosshair, ExternalLink, LocateFixed, MapPinned,
  Navigation, Satellite, ShieldCheck, SquarePen,
} from "lucide-react";

type GeoProps = {
  farmId: string;
  farmName: string;
  latitude: number | null;
  longitude: number | null;
  hectares: number | null;
  canEdit: boolean;
};

function validLocation(lat: number | null, lon: number | null): lat is number {
  return lat !== null && lon !== null && Number.isFinite(lat) &&
    Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

export function FarmGeoExplorer({ farmId, farmName, latitude, longitude, hectares, canEdit }: GeoProps) {
  const [deviceLocation, setDeviceLocation] = useState<{ lat: number; lon: number; accuracy: number } | null>(null);
  const [gpsError, setGpsError] = useState("");
  const [gpsBusy, setGpsBusy] = useState(false);
  const [showExternalMap, setShowExternalMap] = useState(false);
  const persisted = validLocation(latitude, longitude);
  const lat = persisted ? latitude! : (deviceLocation?.lat ?? null);
  const lon = persisted ? longitude! : (deviceLocation?.lon ?? null);
  const hasPoint = validLocation(lat, lon);
  const editUrl = "/farms/" + encodeURIComponent(farmId) + "/edit" +
    (deviceLocation ? "?gpsLat=" + deviceLocation.lat.toFixed(7) + "&gpsLon=" + deviceLocation.lon.toFixed(7) : "");
  const radiusKm = hectares && hectares > 0 ? Math.min(20, Math.max(1, Math.sqrt(hectares / 100))) : 2;
  const dLat = radiusKm / 111.32;
  const dLon = hasPoint ? radiusKm / Math.max(10, 111.32 * Math.cos(lat! * Math.PI / 180)) : dLat;
  const mapSrc = hasPoint
    ? "https://www.openstreetmap.org/export/embed.html?bbox=" +
      [lon! - dLon, lat! - dLat, lon! + dLon, lat! + dLat].map(x => x.toFixed(6)).join("%2C") +
      "&layer=mapnik&marker=" + lat!.toFixed(7) + "%2C" + lon!.toFixed(7)
    : "";
  const openStreetMapLink = hasPoint
    ? "https://www.openstreetmap.org/?mlat=" + lat!.toFixed(7) + "&mlon=" + lon!.toFixed(7) +
      "#map=14/" + lat!.toFixed(7) + "/" + lon!.toFixed(7)
    : "https://www.openstreetmap.org/";

  function locate() {
    setGpsError("");
    setGpsBusy(true);
    if (!navigator.geolocation) {
      setGpsError("Tu navegador no permite obtener la ubicación GPS.");
      setGpsBusy(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDeviceLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setGpsBusy(false);
      },
      (err) => {
        setGpsBusy(false);
        setGpsError(err.code === 1
          ? "Debes autorizar la ubicación desde el navegador para usar esta función."
          : "No se pudo obtener una posición confiable. Prueba al aire libre o escribe las coordenadas manualmente.");
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 16000 },
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link href={"/farms/" + encodeURIComponent(farmId)}
        className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#806034]">
        <ArrowLeft className="size-4" aria-hidden={true} /> Volver a {farmName}
      </Link>
      <section className="rounded-[26px] bg-[linear-gradient(115deg,#182d21,#345039)] p-5 text-white sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d5b67b]">GanadIA · Geografía de fincas</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Ubicación GPS de la finca</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-white/80">
          {farmName}. Consulta el punto de referencia y prepara los datos para un futuro mapa de
          potreros, cercas, bebederos y recorridos del ganado.
        </p>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 overflow-hidden rounded-[25px] border border-[#dfe7dd] bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-[#e8ece5] px-4 py-4 sm:px-5">
            <div className="flex items-center gap-2">
              <MapPinned className="size-5 text-[#907141]" aria-hidden={true} />
              <h2 className="text-base font-bold text-[#1c3627]">Visor de ubicación</h2>
            </div>
            <span className={"rounded-full px-3 py-1.5 text-[11px] font-bold " +
              (persisted ? "bg-[#e9f2e8] text-[#356542]" : "bg-[#f4efe5] text-[#82683d]")}>
              {persisted ? "GPS registrado" : "GPS pendiente"}
            </span>
          </div>
          <div className="relative flex min-h-[300px] items-center justify-center bg-[radial-gradient(circle_at_25%_25%,#e4e7de,#d1dacd)] sm:min-h-[420px]">
            {showExternalMap && hasPoint ? (
              <iframe
                src={mapSrc}
                title={"Mapa de " + farmName}
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                className="absolute inset-0 size-full border-0"
                allow="fullscreen"
              />
            ) : (
              <div className="max-w-md px-5 py-10 text-center">
                <span className="mx-auto flex size-16 items-center justify-center rounded-3xl border border-[#c7d2c3] bg-white/75 text-[#487052]">
                  <Compass className="size-9" aria-hidden={true} />
                </span>
                <h3 className="mt-4 text-lg font-bold text-[#2c4834]">
                  {hasPoint ? "Finca localizada" : "Todavía no hay coordenadas guardadas"}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#657567]">
                  {hasPoint
                    ? "Elige cuándo abrir el mapa externo. Esto enviará las coordenadas visibles al proveedor de cartografía OpenStreetMap."
                    : "Registra el punto GPS desde la ubicación de la finca o escribe latitud y longitud en su ficha."}
                </p>
                {hasPoint && (
                  <button type="button" onClick={() => setShowExternalMap(true)}
                    className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#765d36] px-5 text-sm font-bold text-white hover:bg-[#5e4928]">
                    <Navigation className="size-4" aria-hidden={true}/> Cargar mapa
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e8ece5] p-4 text-xs text-[#728076] sm:p-5">
            <p>Cartografía externa bajo demanda. El punto GPS no representa los límites legales de la finca.</p>
            {hasPoint && <a href={openStreetMapLink} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-bold text-[#806034] hover:underline">
              Ver en OpenStreetMap <ExternalLink className="size-3.5" aria-hidden={true}/>
            </a>}
          </div>
        </div>
        <aside className="space-y-4">
          <section className="rounded-[22px] border border-[#dfe7dd] bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-bold text-[#23402d]">
              <Crosshair className="size-5 text-[#99743c]" aria-hidden={true}/> Coordenadas
            </h2>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {[["Latitud", lat], ["Longitud", lon]].map(([label, value]) => (
                <div key={String(label)} className="min-w-0 rounded-xl bg-[#f5f7f3] p-3">
                  <p className="text-[11px] text-[#718276]">{label}</p>
                  <p className="mt-1 break-all text-sm font-bold tabular-nums text-[#294633]">
                    {typeof value === "number" ? value.toFixed(7) : "Pendiente"}
                  </p>
                </div>
              ))}
            </div>
            {hectares && hectares > 0 ? <p className="mt-4 text-sm text-[#728076]">
              Superficie declarada: <strong>{new Intl.NumberFormat("es-VE", {maximumFractionDigits:2}).format(hectares)} ha</strong>
            </p> : null}
            {deviceLocation && <p className="mt-3 text-xs leading-5 text-[#68776d]">
              Ubicación del teléfono: precisión informada ±{Math.round(deviceLocation.accuracy)} m.
              No se guardó automáticamente.
            </p>}
            <button type="button" disabled={gpsBusy} onClick={locate}
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[#cad7c9] bg-[#f1f6ef] px-4 text-sm font-bold text-[#385743] disabled:opacity-60">
              <LocateFixed className="size-4" aria-hidden={true}/>
              {gpsBusy ? "Buscando señal GPS..." : "Obtener GPS del teléfono"}
            </button>
            {gpsError && <p role="alert" className="mt-3 text-xs leading-5 text-rose-700">{gpsError}</p>}
            {canEdit && <Link href={editUrl} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#785d33] px-4 text-sm font-bold text-white hover:bg-[#604923]">
              <SquarePen className="size-4" aria-hidden={true}/>
              {deviceLocation ? "Revisar y guardar coordenadas" : "Editar ubicación de finca"}
            </Link>}
          </section>
          <section className="rounded-[22px] border border-[#dfe7dd] bg-white p-5 text-sm leading-6 text-[#6c7d70]">
            <h3 className="flex items-center gap-2 font-bold text-[#2a4431]"><Satellite className="size-5 text-[#99743c]" aria-hidden={true}/> Próximas capas</h3>
            <p className="mt-2">Límites y potreros, fotografías satelitales, puntos de agua, recorridos, cobertura vegetal y alertas geográficas.</p>
            <p className="mt-3 text-xs leading-5">Las imágenes satelitales y el monitoreo de animales en tiempo real requieren integraciones adicionales; esta versión es un visor de ubicación inicial.</p>
          </section>
          <section className="flex gap-3 rounded-[20px] bg-[#eff4ec] p-4 text-xs leading-6 text-[#536b58]">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#52815b]" aria-hidden={true}/>
            <p>Tu posición del teléfono solo se solicita al pulsar el botón y no se guarda sin que confirmes la edición de la finca.</p>
          </section>
        </aside>
      </section>
    </div>
  );
}
