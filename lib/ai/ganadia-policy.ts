/**
 * GanadIA AI - pure authorization rules for read-only tools.
 * The role is always read from the active tenant membership on the server.
 */
export const aiTools = [
  "listar_fincas",
  "resumen_ganado",
  "resumen_sanidad",
  "resumen_finanzas",
  "preseleccionar_venta",
] as const;
export type AiToolName = typeof aiTools[number];

const globalReaders = ["TENANT_OWNER", "TENANT_ADMIN"];
const livestockReaders = ["FARM_MANAGER", "OPERATOR"];
export function allowedAiTools(role: string): AiToolName[] {
  if (globalReaders.includes(role)) return [...aiTools];
  if (role === "ACCOUNTING") return ["listar_fincas", "resumen_finanzas"];
  if (role === "VETERINARIAN") return ["listar_fincas", "resumen_sanidad"];
  if (livestockReaders.includes(role)) return ["listar_fincas", "resumen_ganado", "resumen_sanidad", "preseleccionar_venta"];
  return [];
}
export function isAuthorizedAiTool(role: string, tool: string): tool is AiToolName {
  return allowedAiTools(role).includes(tool as AiToolName);
}
export function scopeFarmIds(
  requestedFarmId: string | null,
  authorizedFarmIds: readonly string[],
): string[] | null {
  if (requestedFarmId && !authorizedFarmIds.includes(requestedFarmId)) return null;
  return requestedFarmId ? [requestedFarmId] : [...authorizedFarmIds];
}
export function isPaidAiEnabled(flags: { enabled?: string; approved?: string; keyPresent: boolean }): boolean {
  return flags.enabled === "true" && flags.approved === "true" && flags.keyPresent;
}
