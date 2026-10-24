import type { AiToolName } from "./ganadia-policy";

/**
 * Match every explicitly requested read-only ERP domain.
 * Do not interpret a passing mention of "mis fincas" as the only requested data.
 * This module has no database, auth, or external API dependencies.
 */
export function inferGanadiaReadTools(message: string): AiToolName[] {
  const text = message.toLocaleLowerCase("es-VE")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const health = /\b(sanidad|salud|vacuna|vacunas|vacunacion|tratamiento|tratamientos|veterinario|veterinaria|enfermedad|enfermedades|desparasitacion)\b/.test(text);
  const finance = /\b(gastos?|ingresos?|finanzas?|cuentas? por cobrar|cuentas? por pagar|balance|deudas?|nomina|facturacion|pagos?|cobros?)\b/.test(text);
  const sales = /\b(vender|venta|ventas|preseleccion|listos? para vender|comercializar|comercializacion)\b/.test(text);
  const animalMetrics = /\b(peso|pesos|pesaje|promedio de peso|kg|kilogramos?|kilos|cabezas|recuento|numero de animales|total de animales|cantidad de animales|cuantos animales|cuantas reses)\b/.test(text);
  const animals = /\b(ganado|animales|animal|reses|res|vacas|vaca|novillos|novillo|toros|toro|becerros|becerro|terneros|ternero|vientres|rebanos|rebano)\b/.test(text);
  const farms = /\b(finca|fincas|hato|hatos|fundacion|fundaciones)\b/.test(text);
  const operationHistory = /\b(trabajo de llano|trabajos de llano|jornada de llano|jornadas de llano|jornada de pesaje|ultimo pesaje|ultimos pesajes|ultima pesada|pesajes anteriores|historial de pesajes|ganancia diaria|ganancia mensual|ganancia de peso|engorde|engordando|ganando peso|proyeccion|proyectar|estimacion de peso|estimar peso|cuanto han aumentado|cuanto ha aumentado)\b/.test(text);
  const explicitKgThreshold = /\b\d{2,4}(?:[.,]\d+)?\s*(?:kg|kilos?|kilogramos?)(?:\s+(?:o|y)\s+mas)?\b/.test(text) &&
    /\b(animales?|ganado|vacas?|reses|toros?|pesan|tienen|cabezas|cuantos|cuantas|venta|vender|listos?|mayores?|superan)\b/.test(text);
  const requested: AiToolName[] = [];
  if ((animalMetrics || animals) && !explicitKgThreshold && !sales && !health) requested.push("resumen_ganado");
  if (health) requested.push("resumen_sanidad");
  if (finance) requested.push("resumen_finanzas");
  if (sales || explicitKgThreshold) requested.push("preseleccionar_venta");
  if (operationHistory) requested.push("analizar_pesajes");
  if (farms) requested.push("listar_fincas");
  return requested;
}
