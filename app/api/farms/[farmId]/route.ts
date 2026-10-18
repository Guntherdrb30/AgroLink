import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getCurrentTenant } from "@/lib/auth/session";
import { farmNoStoreHeaders, farmWriteRequestSchema, isSameOriginFarmRequest } from "@/lib/farms/farm-write-request";
import { hasTenantRole } from "@/lib/permissions/rbac";
import { updateTenantFarm } from "@/server/services/farm-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const editorRoles = ["TENANT_OWNER", "TENANT_ADMIN", "FARM_MANAGER"] as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ farmId: string }> }) {
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
    console.error("FARM_UPDATE_AUTH_FAILED", error);
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
    return NextResponse.json({ error: "Tu rol no permite actualizar fincas." }, {
      status: 403, headers: farmNoStoreHeaders,
    });
  }

  const { farmId } = await params;
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(farmId)) {
    return NextResponse.json({ error: "Identificador de finca no válido." }, {
      status: 400, headers: farmNoStoreHeaders,
    });
  }

  const parsed = farmWriteRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Revisa los datos de la finca antes de guardar." }, {
      status: 422, headers: farmNoStoreHeaders,
    });
  }

  try {
    await updateTenantFarm(
      context.tenant.id,
      farmId,
      parsed.data.farm,
      parsed.data.assets ?? {},
      context.user.id,
    );
    revalidatePath("/dashboard");
    revalidatePath("/farms");
    revalidatePath("/farms/" + farmId);
    return NextResponse.json({ farmId }, { headers: farmNoStoreHeaders });
  } catch (error) {
    console.error("FARM_UPDATE_API_FAILED", error);
    if (error instanceof Error && error.message === "FARM_NOT_FOUND") {
      return NextResponse.json({ error: "No se encontró esta finca en tu empresa." }, {
        status: 404, headers: farmNoStoreHeaders,
      });
    }
    if (error instanceof Error && error.message.startsWith("FARM_UPLOAD_")) {
      return NextResponse.json({
        error: "No se pudo verificar la fotografía cargada. Selecciona nuevamente la imagen y vuelve a intentar.",
      }, { status: 422, headers: farmNoStoreHeaders });
    }
    return NextResponse.json({
      error: "No se pudo actualizar la finca. Conservamos los datos e imágenes anteriores.",
    }, { status: 500, headers: farmNoStoreHeaders });
  }
}
