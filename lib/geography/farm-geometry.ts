
/** Geometría WGS84 para fincas y potreros. Coordenadas en orden [longitud, latitud]. */
export type LngLat = [number, number];
export type GeoRing = LngLat[];
export type FarmAreaKind = "BOUNDARY" | "FOUNDATION" | "PADDOCK";
export type AreaGeometry = { type: "Polygon"; coordinates: [GeoRing] };
export type GeoValidation = { ring: GeoRing; geometry: AreaGeometry; areaHectares: number };

const RADIUS = 6371008.8;
const RAD = Math.PI / 180;
const EPS = 1e-10;

function distanceSq(a: LngLat, b: LngLat) {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
}
function cross(a: LngLat, b: LngLat, c: LngLat) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}
function between(a: number, b: number, c: number) {
  return c + EPS >= Math.min(a, b) && c - EPS <= Math.max(a, b);
}
function pointOnSegment(point: LngLat, a: LngLat, b: LngLat) {
  return Math.abs(cross(a, b, point)) <= EPS &&
    between(a[0], b[0], point[0]) && between(a[1], b[1], point[1]);
}
function segmentsIntersect(a: LngLat, b: LngLat, c: LngLat, d: LngLat): boolean {
  const s1 = cross(a, b, c), s2 = cross(a, b, d);
  const s3 = cross(c, d, a), s4 = cross(c, d, b);
  if (((s1 > EPS && s2 < -EPS) || (s1 < -EPS && s2 > EPS)) &&
      ((s3 > EPS && s4 < -EPS) || (s3 < -EPS && s4 > EPS))) return true;
  return (Math.abs(s1) <= EPS && pointOnSegment(c, a, b)) ||
    (Math.abs(s2) <= EPS && pointOnSegment(d, a, b)) ||
    (Math.abs(s3) <= EPS && pointOnSegment(a, c, d)) ||
    (Math.abs(s4) <= EPS && pointOnSegment(b, c, d));
}
function properCross(a: LngLat, b: LngLat, c: LngLat, d: LngLat) {
  const abC = cross(a, b, c), abD = cross(a, b, d);
  const cdA = cross(c, d, a), cdB = cross(c, d, b);
  return ((abC > EPS && abD < -EPS) || (abC < -EPS && abD > EPS)) &&
    ((cdA > EPS && cdB < -EPS) || (cdA < -EPS && cdB > EPS));
}
function normalCoord(v: unknown, min: number, max: number, label: string): number {
  if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max) {
    throw new GeoInputError("COORDENADA_INVALIDA", "Revisa " + label + ": se espera una coordenada GPS decimal.");
  }
  return Math.round(v * 1e7) / 1e7;
}
export class GeoInputError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "GeoInputError";
  }
}
export function isFarmAreaKind(value: unknown): value is FarmAreaKind {
  return value === "BOUNDARY" || value === "FOUNDATION" || value === "PADDOCK";
}

/** Superficie geodésica aproximada en hectáreas (esfera WGS84). No es deslinde catastral. */
export function polygonAreaHectares(ring: GeoRing): number {
  if (ring.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    sum += (b[0] - a[0]) * RAD * (2 + Math.sin(a[1] * RAD) + Math.sin(b[1] * RAD));
  }
  return Math.abs(sum * RADIUS * RADIUS / 2) / 10000;
}

export function validateGeoRing(raw: unknown): GeoValidation {
  if (!Array.isArray(raw)) throw new GeoInputError("SIN_VERTICES", "Dibuja un polígono sobre el mapa.");
  if (raw.length > 303) throw new GeoInputError("MUCHOS_VERTICES", "Máximo 300 puntos por polígono.");
  const points: GeoRing = raw.map((p, i) => {
    if (!Array.isArray(p) || p.length !== 2) {
      throw new GeoInputError("COORDENADA_INVALIDA", "El punto " + (i + 1) + " no es válido.");
    }
    return [normalCoord(p[0], -180, 180, "longitud"), normalCoord(p[1], -85, 85, "latitud")];
  });
  if (points.length >= 4 && distanceSq(points[0], points[points.length - 1]) < 1e-14) {
    points.pop(); // input GeoJSON puede incluir el vértice final de cierre
  }
  if (points.length < 3) throw new GeoInputError("POCOS_VERTICES", "Selecciona al menos tres puntos.");
  if (points.length > 300) throw new GeoInputError("MUCHOS_VERTICES", "Máximo 300 puntos por polígono.");
  const lngs = points.map(p => p[0]), lats = points.map(p => p[1]);
  if (Math.max(...lngs) - Math.min(...lngs) > 3 || Math.max(...lats) - Math.min(...lats) > 3) {
    throw new GeoInputError("EXTENSION_EXCESIVA", "El polígono es demasiado extenso. Revisa que las coordenadas sean correctas.");
  }
  for (let i = 0; i < points.length; i++) {
    if (distanceSq(points[i], points[(i + 1) % points.length]) < 1e-14) {
      throw new GeoInputError("PUNTOS_DUPLICADOS", "Hay puntos repetidos o demasiado próximos.");
    }
  }
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    for (let j = i + 1; j < points.length; j++) {
      if ((j === i + 1) || (i === 0 && j === points.length - 1)) continue;
      if (segmentsIntersect(a, b, points[j], points[(j + 1) % points.length])) {
        throw new GeoInputError("POLIGONO_CRUZADO", "Los lados del polígono se cruzan. Corrige los puntos.");
      }
    }
  }
  const hectares = polygonAreaHectares(points);
  if (!Number.isFinite(hectares) || hectares < 0.0001 || hectares > 3000000) {
    throw new GeoInputError("AREA_INVALIDA", "La superficie calculada no es válida.");
  }
  const closed: GeoRing = [...points, [...points[0]] as LngLat];
  return {
    ring: points,
    geometry: { type: "Polygon", coordinates: [closed] },
    areaHectares: Math.round(hectares * 10000) / 10000,
  };
}

export function pointInsidePolygon(point: LngLat, ring: GeoRing): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if (pointOnSegment(point, a, b)) return true;
    if ((a[1] > point[1]) !== (b[1] > point[1]) &&
      point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) {
      inside = !inside;
    }
  }
  return inside;
}

/** Rechaza potreros que crucen el perímetro aun con los vértices dentro de un límite cóncavo. */
export function polygonContainedBy(outer: GeoRing, inner: GeoRing): boolean {
  if (inner.some(p => !pointInsidePolygon(p, outer))) return false;
  for (let i = 0; i < inner.length; i++) {
    const a = inner[i], b = inner[(i + 1) % inner.length];
    const midpoint: LngLat = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    if (!pointInsidePolygon(midpoint, outer)) return false;
    for (let j = 0; j < outer.length; j++) {
      if (properCross(a, b, outer[j], outer[(j + 1) % outer.length])) return false;
    }
  }
  return true;
}
export function ringFromStoredGeoJson(value: unknown): GeoRing | null {
  if (!value || typeof value !== "object" || (value as { type?: unknown }).type !== "Polygon") return null;
  const coords = (value as { coordinates?: unknown }).coordinates;
  if (!Array.isArray(coords) || !Array.isArray(coords[0])) return null;
  try { return validateGeoRing(coords[0]).ring; } catch { return null; }
}

/** Los vértices se mantienen en WGS84. Devuelve puntos de referencia, no límites legales. */
export function exportGeoJsonFeature(
  name: string, kind: FarmAreaKind, ring: GeoRing, hectares: number,
) {
  return {
    type: "Feature" as const,
    properties: { name, kind, areaHectares: hectares, source: "GanadIA - trazado usuario" },
    geometry: { type: "Polygon" as const, coordinates: [[...ring, [...ring[0]]]] },
  };
}
