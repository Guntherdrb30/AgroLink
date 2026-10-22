import { allowedFarmIds } from "@/lib/permissions/farm-access";
import { NextResponse } from "next/server";
import { getCurrentTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import {
  validateGeoRing, ringFromStoredGeoJson, polygonContainedBy,
  type FarmAreaKind,
} from "@/lib/geography/farm-geometry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type RouteContext = { params: Promise<{ farmId: string }> };

const reply = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });

async function permittedFarm(farmId: string) {
  const current = await getCurrentTenant();
  if (!current) return null;
  const allowed=await allowedFarmIds(current.tenant.id,current.user.id,current.membership.role);if(allowed&&!allowed.includes(farmId))return null;
  const farm = await prisma.farm.findFirst({
    where: { id: farmId, tenantId: current.tenant.id }, select: { id: true },
  });
  return farm ? current : null;
}
function canEdit(role: string) {
  return ["TENANT_OWNER", "TENANT_ADMIN", "FARM_MANAGER"].includes(role);
}
async function readPayload(request: Request) {
  const body = await request.text();
  if (body.length > 50000) throw new Error("Solicitud demasiado extensa");
  return JSON.parse(body) as Record<string, unknown>;
}
function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function GET(_: Request, { params }: RouteContext) {
  const { farmId } = await params;
  const current = await permittedFarm(farmId);
  if (!current) return reply({ error: "Finca no disponible" }, 404);
  const items = await prisma.farmGeoArea.findMany({
    where: { tenantId: current.tenant.id, farmId }, orderBy: { createdAt: "asc" },
  });
  return reply({ areas: items.map((a) => ({
    id: a.id, name: a.name, kind: a.kind, geometry: a.coordinates,
    areaHectares: Number(a.areaHectares), version: a.version,
  })) });
}

export async function POST(request: Request, { params }: RouteContext) {
  const { farmId } = await params;
  const current = await permittedFarm(farmId);
  if (!current) return reply({ error: "Finca no disponible" }, 404);
  if (!canEdit(current.membership.role) || !sameOrigin(request))
    return reply({ error: "Operación no autorizada" }, 403);
  let payload: Record<string, unknown>;
  try { payload = await readPayload(request); }
  catch { return reply({ error: "Solicitud inválida o demasiado extensa" }, 400); }
  const kind = payload.kind;
  if (kind !== "BOUNDARY" && kind !== "FOUNDATION" && kind !== "PADDOCK")
    return reply({ error: "Tipo de área inválido" }, 400);
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  if (name.length < 3 || name.length > 80)
    return reply({ error: "El nombre debe tener entre 3 y 80 caracteres" }, 400);
  let polygon: ReturnType<typeof validateGeoRing>;
  try { polygon = validateGeoRing(payload.points); }
  catch (error) {
    return reply({ error: error instanceof Error ? error.message : "Polígono inválido" }, 400);
  }

  const areas = await prisma.farmGeoArea.findMany({
    where: { farmId, tenantId: current.tenant.id },
  });
  const id = typeof payload.id === "string" ? payload.id : null;
  const editing = id ? areas.find((a) => a.id === id) : null;
  if (id && !editing) return reply({ error: "Área no encontrada" }, 404);
  if (editing && editing.kind !== kind)
    return reply({ error: "No es posible cambiar el tipo de área" }, 409);
  if (editing && (typeof payload.version !== "number" || payload.version !== editing.version))
    return reply({ error: "Otro usuario modificó esta área. Actualiza el mapa." }, 409);
  const boundary = areas.find((a) => a.kind === "BOUNDARY");
  if (kind === "BOUNDARY" && boundary && boundary.id !== editing?.id)
    return reply({ error: "Solo puede existir un perímetro general por finca" }, 409);
  if ((kind === "PADDOCK" || kind === "FOUNDATION") && boundary) {
    const outer = ringFromStoredGeoJson(boundary.coordinates);
    if (!outer || !polygonContainedBy(outer, polygon.ring))
      return reply({ error: "El área debe estar dentro del perímetro de la finca" }, 400);
  }
  if (kind === "BOUNDARY") {
    for (const paddock of areas.filter((a) => a.kind !== "BOUNDARY")) {
      const ring = ringFromStoredGeoJson(paddock.coordinates);
      if (!ring || !polygonContainedBy(polygon.ring, ring))
        return reply({ error: "El nuevo perímetro excluiría un potrero o fundación registrados" }, 409);
    }
  }

  const data = { name, coordinates: polygon.geometry, areaHectares: polygon.areaHectares };
  try {
    const area = editing
      ? await (async () => {
        const change = await prisma.farmGeoArea.updateMany({
          where: { id: editing.id, tenantId: current.tenant.id, farmId, version: editing.version },
          data: { ...data, version: { increment: 1 } },
        });
        if (change.count !== 1) return null;
        return prisma.farmGeoArea.findUnique({ where: { id: editing.id } });
      })()
      : await prisma.farmGeoArea.create({
        data: {
          id: crypto.randomUUID(), tenantId: current.tenant.id, farmId,
          kind: kind as FarmAreaKind, ...data, createdById: current.user.id,
        },
      });
    if (!area) return reply({ error: "El área cambió mientras la editabas. Recarga y revisa." }, 409);
    return reply({ area: {
      id: area.id, name: area.name, kind: area.kind, geometry: area.coordinates,
      areaHectares: Number(area.areaHectares), version: area.version,
    } });
  } catch {
    return reply({ error: "No se pudo guardar. Revisa el nombre y vuelve a intentarlo." }, 409);
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const { farmId } = await params;
  const current = await permittedFarm(farmId);
  if (!current) return reply({ error: "Finca no disponible" }, 404);
  if (!canEdit(current.membership.role) || !sameOrigin(request))
    return reply({ error: "Operación no autorizada" }, 403);
  let payload: Record<string, unknown>;
  try { payload = await readPayload(request); }
  catch { return reply({ error: "Solicitud inválida" }, 400); }
  if (typeof payload.id !== "string" || !Number.isInteger(payload.version))
    return reply({ error: "Referencia o versión inválida" }, 400);
  const target = await prisma.farmGeoArea.findFirst({
    where: { id: payload.id, version: payload.version as number, tenantId: current.tenant.id, farmId },
  });
  if (!target) return reply({ error: "Área no encontrada o modificada por otro usuario" }, 409);
  if (target.kind === "BOUNDARY") {
    const paddocks = await prisma.farmGeoArea.count({
      where: { tenantId: current.tenant.id, farmId, kind: { in: ["PADDOCK", "FOUNDATION"] } },
    });
    if (paddocks) return reply({ error: "Debes eliminar primero las fundaciones y potreros" }, 409);
  }
  const result = await prisma.farmGeoArea.deleteMany({
    where: { id: target.id, version: target.version, tenantId: current.tenant.id, farmId },
  });
  return result.count === 1 ? reply({ ok: true }) : reply({ error: "El área cambió antes de eliminarla" }, 409);
}
