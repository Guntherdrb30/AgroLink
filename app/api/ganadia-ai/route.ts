import { NextResponse } from "next/server";
import { getCurrentTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { allowedFarmIds } from "@/lib/permissions/farm-access";

export const dynamic = "force-dynamic";
const output = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: { "Cache-Control": "private, no-store" } });
const permitted = new Set(["fincas", "ganado", "sanidad", "venta", "finanzas", "ayuda"]);

export async function POST(request: Request) {
  const ctx = await getCurrentTenant();
  if (!ctx) return output({ error: "Acceso denegado" }, 401);
  if (request.headers.get("origin") && request.headers.get("origin") !== new URL(request.url).origin) return output({ error: "Origen no autorizado" }, 403);
  const raw = await request.text();
  if (raw.length > 4000) return output({ error: "Consulta demasiado extensa" }, 413);
  let input: { topic?: unknown; farmId?: unknown; minWeightKg?: unknown };
  try { input = JSON.parse(raw); } catch { return output({ error: "Solicitud invalida" }, 400); }
  const topic = typeof input.topic === "string" ? input.topic : "";
  if (!permitted.has(topic)) return output({ error: "Consulta no disponible" }, 400);
  const role = ctx.membership.role;
  const allowed = await allowedFarmIds(ctx.tenant.id, ctx.user.id, role);
  const farmId = typeof input.farmId === "string" ? input.farmId : "";
  if (farmId && allowed && !allowed.includes(farmId)) return output({ error: "Finca no autorizada" }, 403);
  const where = { tenantId: ctx.tenant.id, ...(farmId ? { id: farmId } : allowed ? { id: { in: allowed } } : {}) };
  const farms = await prisma.farm.findMany({ where, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 100 });
  if (farmId && farms.length !== 1) return output({ error: "Finca no disponible" }, 404);
  const ids = farms.map(f => f.id);
  if (topic === "finanzas") {
    if (!["TENANT_OWNER", "TENANT_ADMIN", "ACCOUNTING"].includes(role)) return output({ error: "Sin acceso a finanzas" }, 403);
    const records = await prisma.farmErpFinance.groupBy({
      by: ["currency", "kind"], where: { tenantId: ctx.tenant.id, farmId: { in: ids } },
      _sum: { amountCents: true }, _count: { _all: true },
    });
    return output({ kind: "finance", farms, records, note: "Movimientos registrados por moneda y clase; no equivale a utilidad ni saldo bancario." });
  }
  if (role === "ACCOUNTING") return output({ error: "Solo tienes acceso al area financiera" }, 403);
  if (role === "VETERINARIAN" && !["sanidad", "ayuda", "fincas"].includes(topic)) return output({ error: "Acceso veterinario limitado a sanidad de sus fincas" }, 403);
  if (topic === "ayuda") return output({ kind: "help", farms, note: "El asistente ofrece consultas verificadas. La conversacion generativa de OpenAI y las acciones de escritura aun no estan activadas." });
  if (topic === "fincas") return output({ kind: "farms", farms });
  if (topic === "venta") {
    const weight = typeof input.minWeightKg === "number" && Number.isFinite(input.minWeightKg) && input.minWeightKg > 0 && input.minWeightKg <= 2000 ? input.minWeightKg : null;
    if (weight === null) return output({ error: "Indica un peso minimo valido" }, 400);
    const animals = await prisma.animal.findMany({
      where: { tenantId: ctx.tenant.id, farmId: { in: ids }, currentWeightKg: { gte: weight } },
      select: { internalCode: true, farmId: true, currentWeightKg: true, healthStatus: true }, orderBy: { internalCode: "asc" }, take: 500,
    });
    return output({ kind: "sale_preparation", minWeightKg: weight, farms, count: animals.length,
      totalWeightKg: animals.reduce((sum, a) => sum + Number(a.currentWeightKg ?? 0), 0),
      animals: animals.map(a => ({ ...a, currentWeightKg: a.currentWeightKg?.toString() ?? null })),
      note: "Preseleccion sin reserva ni venta; no se calculan precios sin fuente y fecha verificadas." });
  }
  if (topic === "sanidad") {
    const grouped = await prisma.animal.groupBy({ by: ["healthStatus"], where: { tenantId: ctx.tenant.id, farmId: { in: ids } }, _count: { _all: true } });
    return output({ kind: "health", farms, grouped });
  }
  const total = await prisma.animal.count({ where: { tenantId: ctx.tenant.id, farmId: { in: ids } } });
  return output({ kind: "livestock", farms, total });
}
