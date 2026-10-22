import { allowedFarmIds } from "@/lib/permissions/farm-access";
import { NextResponse } from "next/server";
import { getCurrentTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import {
  calculateGrazingPlan, validateGrazingPlanInput, GrazingInputError,
} from "@/lib/planning/grazing-foundations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Ctx = { params: Promise<{ farmId: string }> };
const response = (data: unknown, status = 200) => NextResponse.json(data, {
  status, headers: { "Cache-Control": "private, no-store" },
});

async function permission(farmId: string) {
  const current = await getCurrentTenant();
  if (!current || !["TENANT_OWNER","TENANT_ADMIN","FARM_MANAGER","OPERATOR"].includes(current.membership.role)) return null;
  const allowed=await allowedFarmIds(current.tenant.id,current.user.id,current.membership.role);if(allowed&&!allowed.includes(farmId))return null;
  const farm = await prisma.farm.findFirst({
    where: { tenantId: current.tenant.id, id: farmId },
    select: { id: true, hectares: true },
  });
  return farm ? { current, farm } : null;
}
export async function GET(_: Request, { params }: Ctx) {
  const { farmId } = await params;
  const valid = await permission(farmId);
  if (!valid) return response({ error: "No disponible" }, 404);
  const records = await prisma.farmGrazingPlan.findMany({
    where: { tenantId: valid.current.tenant.id, farmId },
    select: { id: true, title: true, createdAt: true, output: true },
    orderBy: { createdAt: "desc" },
    take: 12,
  });
  return response({ plans: records });
}

export async function POST(request: Request, { params }: Ctx) {
  const { farmId } = await params;
  const valid = await permission(farmId);
  if (!valid) return response({ error: "No disponible" }, 404);
  if (!["TENANT_OWNER","TENANT_ADMIN","FARM_MANAGER"].includes(valid.current.membership.role))
    return response({ error: "Solo los responsables autorizados pueden guardar planes." }, 403);
  if (request.headers.get("origin") && request.headers.get("origin") !== new URL(request.url).origin)
    return response({ error: "Origen no autorizado" }, 403);
  const body = await request.text();
  if (body.length > 120000) return response({ error: "Plan demasiado grande" }, 413);
  let parsed: unknown;
  try { parsed = JSON.parse(body); }
  catch { return response({ error: "Formato inválido" }, 400); }
  let data: ReturnType<typeof validateGrazingPlanInput>;
  try { data = validateGrazingPlanInput(parsed); }
  catch(error) {
    return response({ error: error instanceof GrazingInputError ? error.message : "Revisa los datos del plan." }, 400);
  }
  // Cada geometría referenciada debe pertenecer a la misma finca y empresa.
  const geoIds = [...new Set(data.foundations.map(f => f.geoAreaId).filter((id): id is string => Boolean(id)))];
  if (geoIds.length) {
    const areas = await prisma.farmGeoArea.findMany({
      where: { id: { in: geoIds }, tenantId: valid.current.tenant.id, farmId, kind: "FOUNDATION" },
      select: { id: true, name: true, areaHectares: true },
    });
    const map = new Map(areas.map(a => [a.id, a]));
    if (map.size !== geoIds.length) return response({ error: "Una fundación no pertenece a esta finca." }, 400);
    data = {
      ...data,
      foundations: data.foundations.map(f => {
        const geo = f.geoAreaId ? map.get(f.geoAreaId) : null;
        return geo ? { ...f, hectares: Number(geo.areaHectares) } : f;
      }),
    };
  }
  const result = calculateGrazingPlan(data);
  const declaredArea = valid.farm.hectares ? Number(valid.farm.hectares) : null;
  if (declaredArea !== null) {
    const sum = data.foundations.reduce((s, f) => s + f.hectares, 0);
    if (sum > declaredArea * 1.03) {
      result.limitations.push("Las hectáreas de las fundaciones superan la superficie declarada de la finca. Revisa los datos antes de ejecutar el diseño.");
    }
  }
  try {
    const saved = await prisma.farmGrazingPlan.create({
      data: {
        id: crypto.randomUUID(), tenantId: valid.current.tenant.id, farmId,
        title: data.title.trim(), input: JSON.parse(JSON.stringify(data)),
        output: JSON.parse(JSON.stringify(result)), createdById: valid.current.user.id,
      },
      select: { id: true, createdAt: true },
    });
    return response({ id: saved.id, createdAt: saved.createdAt, result }, 201);
  } catch {
    return response({ error: "No se pudo guardar el estudio. Inténtalo de nuevo." }, 500);
  }
}
