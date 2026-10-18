import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getCurrentTenant } from "@/lib/auth/session";
import { farmNoStoreHeaders, farmWriteRequestSchema, isSameOriginFarmRequest } from "@/lib/farms/farm-write-request";
import { hasTenantRole } from "@/lib/permissions/rbac";
import { createFarmForTenant } from "@/server/services/farm-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const editorRoles = ["TENANT_OWNER", "TENANT_ADMIN", "FARM_MANAGER"] as const;

export async function POST(request: Request) {
  if (!isSameOriginFarmRequest(request)) {
    return NextResponse.json({ error: "Origen de solicitud no autorizado." }, { status: 403, headers: farmNoStoreHeaders });
  }

  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "Formato de solicitud no válido." }, { status: 415, headers: farmNoStoreHeaders });
  }

  let context;
  try {
    context = await getCurrentTenant();
  } catch (error) {
    console.error("FARM_CREATE_AUTH_FAILED", error);
    return NextResponse.json({ error: "No se pudo verificar tu sesión. Vuelve a iniciar sesión." }, {
      status: 401, headers: farmNoStoreHeaders,
    });
  }
  if (!context) {
    return NextResponse.json({ error: "Tu sesión no está activa. Ingresa nuevamente." }, {
      status: 401, headers: farmNoStoreHeaders,
    });
  }
  if (!hasTenantRole(context.membership.role, [...editorRoles])) {
    return NextResponse.json({ error: "Tu rol no permite crear fincas." }, {
      status: 403, headers: farmNoStoreHeaders,
    });
  }

  const parsed = farmWriteRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Revisa los datos de la finca antes de guardar." }, {
      status: 422, headers: farmNoStoreHeaders,
    });
  }

  try {
    const created = await createFarmForTenant(
      context.tenant.id,
      context.user.id,
      parsed.data.farm,
      parsed.data.assets ?? {},
    );
    revalidatePath("/dashboard");
    revalidatePath("/farms");
    return NextResponse.json({ farmId: created.id }, { status: 201, headers: farmNoStoreHeaders });
  } catch (error) {
    console.error("FARM_CREATE_API_FAILED", error);
    return NextResponse.json({ error: "No se pudo guardar la finca. Los registros existentes se conservan." }, {
      status: 500, headers: farmNoStoreHeaders,
    });
  }
}
