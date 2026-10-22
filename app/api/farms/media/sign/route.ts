import { randomUUID } from "node:crypto";
import { issueSignedToken, presignUrl } from "@vercel/blob";
import { NextResponse } from "next/server";

import {
  createFarmUploadPath,
  maxFarmUploadBytes,
  validateFarmUploadFile,
  type FarmUploadKind,
} from "@/lib/blob/farm-upload-policy";
import { getCurrentTenant } from "@/lib/auth/session";
import { allowedFarmIds } from "@/lib/permissions/farm-access";
import { prisma } from "@/lib/db/prisma";
import { hasTenantRole } from "@/lib/permissions/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store" };
const editorRoles = ["TENANT_OWNER", "TENANT_ADMIN", "FARM_MANAGER"] as const;

export async function POST(request: Request) {
  const context = await getCurrentTenant();
  if (!context) return NextResponse.json({ error: "Sesión requerida." }, { status: 401, headers: noStore });
  if (!hasTenantRole(context.membership.role, [...editorRoles])) {
    return NextResponse.json({ error: "Sin permisos para editar fincas." }, { status: 403, headers: noStore });
  }

  const payload = await request.json().catch(() => null) as {
    kind?: string;
    farmId?: string | null;
    filename?: string;
    contentType?: string;
    size?: number;
  } | null;
  const kind = payload?.kind;
  if (kind !== "primaryImage" && kind !== "logo") {
    return NextResponse.json({ error: "Tipo de archivo no válido." }, { status: 400, headers: noStore });
  }
  const farmId = payload?.farmId || null;
  if (farmId && (typeof farmId !== "string" || farmId.length > 100)) {
    return NextResponse.json({ error: "Finca no válida." }, { status: 400, headers: noStore });
  }
  if (
    typeof payload?.filename !== "string" ||
    typeof payload?.contentType !== "string" ||
    typeof payload?.size !== "number"
  ) {
    return NextResponse.json({ error: "Datos de archivo incompletos." }, { status: 400, headers: noStore });
  }
  const validation = validateFarmUploadFile(kind as FarmUploadKind, payload.filename, payload.contentType, payload.size);
  if (validation) return NextResponse.json({ error: validation }, { status: 400, headers: noStore });

  if(!farmId&&!["TENANT_OWNER","TENANT_ADMIN"].includes(context.membership.role))return NextResponse.json({error:"Solo el administrador puede crear una finca"},{status:403,headers:noStore});
  if(farmId){const allowed=await allowedFarmIds(context.tenant.id,context.user.id,context.membership.role);if(allowed&&!allowed.includes(farmId))return NextResponse.json({error:"Finca no autorizada"},{status:403,headers:noStore});}
  if (farmId) {
    const farm = await prisma.farm.findFirst({
      where: { id: farmId, tenantId: context.tenant.id },
      select: { id: true },
    });
    if (!farm) return NextResponse.json({ error: "Finca no encontrada." }, { status: 404, headers: noStore });
  }

  const pathname = createFarmUploadPath(
    { tenantId: context.tenant.id, userId: context.user.id, farmId, kind },
    payload.filename,
    randomUUID(),
  );
  const validUntil = Date.now() + 10 * 60 * 1000;
  try {
    const token = await issueSignedToken({
      pathname,
      operations: ["put"],
      allowedContentTypes: [payload.contentType],
      maximumSizeInBytes: maxFarmUploadBytes(kind),
      validUntil,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    const { presignedUrl } = await presignUrl(token, {
      operation: "put",
      pathname,
      access: "private",
      allowedContentTypes: [payload.contentType],
      maximumSizeInBytes: maxFarmUploadBytes(kind),
      addRandomSuffix: false,
      allowOverwrite: false,
      validUntil,
    });
    return NextResponse.json({ uploadUrl: presignedUrl, pathname }, { headers: noStore });
  } catch (error) {
    console.error("FARM_PRESIGNED_UPLOAD_FAILED", error);
    return NextResponse.json(
      { error: "No fue posible iniciar la carga privada. Inténtalo de nuevo." },
      { status: 503, headers: noStore },
    );
  }
}
