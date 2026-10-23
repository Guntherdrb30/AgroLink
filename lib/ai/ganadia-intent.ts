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
  const requested: AiToolName[] = [];
  if (animalMetrics || (animals && !health && !sales)) requested.push("resumen_ganado");
  if (health) requested.push("resumen_sanidad");
  if (finance) requested.push("resumen_finanzas");
  if (sales) requested.push("preseleccionar_venta");
  if (farms) requested.push("listar_fincas");
  return requested;
}
