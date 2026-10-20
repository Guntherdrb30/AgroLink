/**
 * GanadIA: planificador técnico preliminar de pastoreo por fundaciones.
 *
 * Motor determinista, sin API generativa ni consultas externas.
 * Los resultados son escenarios condicionados por los datos aportados;
 * no reemplazan medición de forraje, aforo, asistencia veterinaria,
 * levantamiento topográfico o evaluación profesional en campo.
 */
export type GrazingSeason = "VERANO" | "INVIERNO" | "TRANSICION";
export type ProductionPurpose = "CEBA" | "CRIA" | "LECHE" | "DOBLE_PROPOSITO";
export type CattleClass = "NOVILLOS" | "MAUTES" | "VACAS" | "VACAS_LECHE" | "BECERROS" | "TOROS" | "MIXTO";

export type GrazingHerd = {
  id: string;
  category: CattleClass;
  headcount: number;
  averageWeightKg: number;
  intakePercent: number;
  restDays: number;
  occupationDays: number;
};

export type FoundationPlanInput = {
  id: string;
  geoAreaId?: string | null;
  name: string;
  hectares: number;
  availablePercent: number;
  season: GrazingSeason;
  forageKgDmHa: number | null; // Medición/estimación suministrada por el usuario, no predicción remota
  usePercent: number;
  waterPoints: number;
  corralKnown: boolean;
  houseKnown: boolean;
  floodRisk: boolean;
  purpose: ProductionPurpose;
  facilities?: { kind: "HOUSE" | "CORRAL" | "WATER" | "ACCESS"; lat: number; lng: number; label?: string }[];
  herds: GrazingHerd[];
};

export type GrazingPlanInput = {
  title: string;
  foundations: FoundationPlanInput[];
  assumptionsSource: "DECLARED" | "MEASURED";
};

export type GrazingHerdResult = {
  category: CattleClass;
  headcount: number;
  intakeKgDmDaily: number;
  paddocks: number;
  estimatedAreaPerPaddockHa: number | null;
  grazingAreaRequiredHa: number | null;
  restDays: number;
  occupationDays: number;
};

export type FoundationPlanResult = {
  id: string;
  name: string;
  grossAreaHa: number;
  availableAreaHa: number;
  heads: number;
  paddocks: number;
  dailyDryMatterKg: number;
  grazingAreaRequiredHa: number | null;
  estimatedAreaBalanceHa: number | null;
  areaAdequacy: "NO_DATOS" | "PRELIMINAR_SUFICIENTE" | "PRELIMINAR_DEFICIT";
  herds: GrazingHerdResult[];
  warnings: string[];
};

export type GrazingPlanResult = {
  modelVersion: string;
  foundations: FoundationPlanResult[];
  totals: {
    foundations: number;
    animals: number;
    paddocks: number;
    availableAreaHa: number;
    dailyDryMatterKg: number;
    requiredAreaHa: number | null;
  };
  limitations: string[];
};

export class GrazingInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GrazingInputError";
  }
}
function checkRange(v: unknown, min: number, max: number, description: string, integer = false): number {
  if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max || (integer && !Number.isInteger(v))) {
    throw new GrazingInputError("Revisa " + description + ": valor fuera de rango.");
  }
  return v;
}
function checkText(v: unknown, field: string, min = 1, max = 100): string {
  if (typeof v !== "string" || v.trim().length < min || v.trim().length > max) {
    throw new GrazingInputError("Revisa " + field + ": debe tener entre " + min + " y " + max + " caracteres.");
  }
  return v.trim();
}
function isOneOf<T extends string>(v: unknown, choices: readonly T[]): v is T {
  return typeof v === "string" && (choices as readonly string[]).includes(v);
}
const seasons: GrazingSeason[] = ["VERANO", "INVIERNO", "TRANSICION"];
const classes: CattleClass[] = ["NOVILLOS", "MAUTES", "VACAS", "VACAS_LECHE", "BECERROS", "TOROS", "MIXTO"];
const purposes: ProductionPurpose[] = ["CEBA", "CRIA", "LECHE", "DOBLE_PROPOSITO"];

export function validateGrazingPlanInput(raw: unknown): GrazingPlanInput {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new GrazingInputError("Se necesita un plan de trabajo.");
  }
  const plan = raw as GrazingPlanInput;
  checkText(plan.title, "nombre del plan", 3, 100);
  if (!isOneOf(plan.assumptionsSource, ["DECLARED", "MEASURED"] as const))
    throw new GrazingInputError("Indica si los datos del forraje fueron medidos o estimados.");
  if (!Array.isArray(plan.foundations) || !plan.foundations.length || plan.foundations.length > 30)
    throw new GrazingInputError("Registra entre 1 y 30 fundaciones por escenario.");
  const foundationIds = new Set<string>();
  const names = new Set<string>();
  let herdsTotal = 0;
  for (const f of plan.foundations) {
    const id = checkText(f.id, "referencia de fundación", 1, 80);
    const name = checkText(f.name, "nombre de fundación", 2, 100);
    if (foundationIds.has(id) || names.has(name.toLocaleLowerCase("es")))
      throw new GrazingInputError("Las fundaciones deben tener identificadores y nombres únicos.");
    foundationIds.add(id);
    names.add(name.toLocaleLowerCase("es"));
    if (f.geoAreaId != null && (typeof f.geoAreaId !== "string" || f.geoAreaId.length > 100))
      throw new GrazingInputError("Polígono de fundación inválido.");
    checkRange(f.hectares, 0.01, 3000000, "hectáreas de " + name);
    checkRange(f.availablePercent, 1, 100, "porcentaje utilizable de " + name);
    if (!isOneOf(f.season, seasons) || !isOneOf(f.purpose, purposes))
      throw new GrazingInputError("Temporada o tipo de producción no reconocido en " + name + ".");
    if (f.forageKgDmHa !== null)
      checkRange(f.forageKgDmHa, 1, 100000, "kg MS/ha de " + name);
    checkRange(f.usePercent, 1, 100, "aprovechamiento de forraje de " + name);
    checkRange(f.waterPoints, 0, 1000, "bebederos de " + name, true);
    if (typeof f.corralKnown !== "boolean" || typeof f.houseKnown !== "boolean" || typeof f.floodRisk !== "boolean")
      throw new GrazingInputError("Revisa los datos de infraestructura de " + name + ".");
    if (f.facilities !== undefined) {
      if (!Array.isArray(f.facilities) || f.facilities.length > 60)
        throw new GrazingInputError("Máximo 60 ubicaciones de infraestructura por fundación.");
      for (const point of f.facilities) {
        if (!point || !isOneOf(point.kind, ["HOUSE","CORRAL","WATER","ACCESS"] as const))
          throw new GrazingInputError("Tipo de infraestructura desconocido.");
        checkRange(point.lat, -85, 85, "latitud de infraestructura");
        checkRange(point.lng, -180, 180, "longitud de infraestructura");
        if (point.label !== undefined) checkText(point.label, "nombre de infraestructura", 1, 80);
      }
    }
    if (!Array.isArray(f.herds) || f.herds.length < 1 || f.herds.length > 15)
      throw new GrazingInputError("Agrega entre 1 y 15 grupos de ganado en " + name + ".");
    const herdIds = new Set<string>();
    for (const g of f.herds) {
      const gid = checkText(g.id, "referencia del grupo", 1, 80);
      if (herdIds.has(gid)) throw new GrazingInputError("Grupos duplicados en " + name);
      herdIds.add(gid);
      if (!isOneOf(g.category, classes)) throw new GrazingInputError("Categoría de ganado desconocida.");
      checkRange(g.headcount, 1, 100000, "cantidad de cabezas", true);
      checkRange(g.averageWeightKg, 15, 2000, "peso promedio por animal");
      checkRange(g.intakePercent, 0.5, 5, "consumo de materia seca (% del peso vivo)");
      checkRange(g.restDays, 1, 180, "días de descanso", true);
      checkRange(g.occupationDays, 1, 30, "días de ocupación", true);
      herdsTotal += 1;
    }
  }
  if (herdsTotal > 150) throw new GrazingInputError("El escenario supera el límite de grupos ganaderos.");
  return plan;
}

const round = (v: number, places = 2): number => Number(v.toFixed(places));
export function calculateGrazingPlan(input: GrazingPlanInput): GrazingPlanResult {
  validateGrazingPlanInput(input);
  const foundations: FoundationPlanResult[] = input.foundations.map(f => {
    const warnings: string[] = [];
    const availableAreaHa = f.hectares * f.availablePercent / 100;
    const useFactor = f.usePercent / 100;
    const yieldKgHa = f.forageKgDmHa;
    let heads = 0;
    let paddocks = 0;
    let dailyDm = 0;
    let requiredAreaHa = 0;
    const herds = f.herds.map(g => {
      const daily = g.headcount * g.averageWeightKg * g.intakePercent / 100;
      const n = Math.ceil(g.restDays / g.occupationDays) + 1;
      const haPer = yieldKgHa === null ? null : daily * g.occupationDays / (yieldKgHa * useFactor);
      heads += g.headcount;
      paddocks += n;
      dailyDm += daily;
      if (haPer !== null) requiredAreaHa += n * haPer;
      return {
        category: g.category, headcount: g.headcount,
        intakeKgDmDaily: round(daily), paddocks: n,
        estimatedAreaPerPaddockHa: haPer === null ? null : round(haPer),
        grazingAreaRequiredHa: haPer === null ? null : round(n * haPer),
        restDays: g.restDays, occupationDays: g.occupationDays,
      };
    });
    let areaAdequacy: FoundationPlanResult["areaAdequacy"] = "NO_DATOS";
    if (yieldKgHa !== null) {
      areaAdequacy = requiredAreaHa <= availableAreaHa + 0.00001 ?
        "PRELIMINAR_SUFICIENTE" : "PRELIMINAR_DEFICIT";
    } else {
      warnings.push("Falta el aforo del forraje (kg de materia seca por ha): no se puede determinar capacidad de carga.");
    }
    if (!f.waterPoints && !(f.facilities ?? []).some(p => p.kind === "WATER"))
      warnings.push("Sin puntos de agua registrados: no aprobar el diseño hasta garantizar acceso al agua para todos los grupos.");
    if (f.waterPoints > 0 && !(f.facilities ?? []).some(p => p.kind === "WATER"))
      warnings.push("Los puntos de agua no están localizados en el mapa: falta verificar distancias y disponibilidad.");
    if (f.corralKnown && !(f.facilities ?? []).some(p => p.kind === "CORRAL"))
      warnings.push("Ubica el corral en el mapa para revisar accesos y recorridos.");
    if (f.houseKnown && !(f.facilities ?? []).some(p => p.kind === "HOUSE"))
      warnings.push("Ubica la casa en el mapa para evitar interferencias con las cercas.");
    if (!f.corralKnown) warnings.push("Falta ubicar el corral o manga de trabajo para diseñar accesos y desplazamientos.");
    if (!f.houseKnown) warnings.push("Ubica la casa y las áreas de uso humano para reservar sus espacios y accesos.");
    if (f.floodRisk) warnings.push("Zona con riesgo de inundación: verificar sabanas, bajos y pasos durante el invierno.");
    if (f.season === "VERANO") warnings.push("Validar aforos y reservas de agua para verano; no usar rendimientos de invierno.");
    if (areaAdequacy === "PRELIMINAR_DEFICIT")
      warnings.push("La demanda estimada excede la superficie utilizable: reducir animales, complementar alimentación o revisar aforos.");
    if (paddocks > 150) warnings.push("Número alto de divisiones: estudiar cercas temporales y manejo flexible por grupos.");
    return {
      id: f.id, name: f.name, grossAreaHa: round(f.hectares),
      availableAreaHa: round(availableAreaHa), heads, paddocks,
      dailyDryMatterKg: round(dailyDm),
      grazingAreaRequiredHa: yieldKgHa === null ? null : round(requiredAreaHa),
      estimatedAreaBalanceHa: yieldKgHa === null ? null : round(availableAreaHa - requiredAreaHa),
      areaAdequacy, herds, warnings,
    };
  });
  const hasAllAforos = foundations.every(f => f.grazingAreaRequiredHa !== null);
  return {
    modelVersion: "grazing-foundations-v1.0",
    foundations,
    totals: {
      foundations: foundations.length,
      animals: foundations.reduce((s,f) => s + f.heads, 0),
      paddocks: foundations.reduce((s,f) => s + f.paddocks, 0),
      availableAreaHa: round(foundations.reduce((s,f) => s + f.availableAreaHa, 0)),
      dailyDryMatterKg: round(foundations.reduce((s,f) => s + f.dailyDryMatterKg, 0)),
      requiredAreaHa: hasAllAforos ? round(foundations.reduce((s,f) => s + (f.grazingAreaRequiredHa ?? 0), 0)) : null,
    },
    limitations: [
      "El cálculo es una simulación de planificación por grupos y fundaciones, no un aforo medido por GanadIA.",
      "La producción y recuperación de pastos varían según especie, suelos, lluvia, estación y manejo del hato.",
      "Los potreros propuestos no son límites catastrales ni instrucciones automáticas de cercado.",
      "Antes de ejecutar, ubicar potreros, casas, corrales, agua, inundaciones, caminos y reservas en el mapa.",
      "Revisar las opciones con el encargado del hato y un especialista local de pastos/agronomía.",
    ],
  };
}
