import { NextResponse } from "next/server";
import { getCurrentTenant } from "@/lib/auth/session";
import { allowedFarmIds } from "@/lib/permissions/farm-access";
import { MAX_PREVIEW_BYTES, IMPORT_FIELDS, type MappingOverrides } from "@/lib/imports/livestock-preview";
import { commitLivestockImport } from "@/server/services/livestock-import-commit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  if (process.env.GANADIA_ENABLE_LIVESTOCK_IMPORT !== "true") {
    return NextResponse.json({ error: "LIVESTOCK_IMPORT_DISABLED" }, { status: 503, headers });
  }
  const context = await getCurrentTenant();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  if (!["TENANT_OWNER", "TENANT_ADMIN", "FARM_MANAGER"].includes(context.membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers });
  }
  const length = Number(request.headers.get("content-length"));
  if (Number.isFinite(length) && length > MAX_PREVIEW_BYTES + 100000) {
    return NextResponse.json({ error: "FILE_TOO_LARGE" }, { status: 413, headers });
  }
  try {
    const form = await request.formData();
    const file = form.get("file"), farmId = form.get("farmId");
    if (!(file instanceof File) || file.size === 0 || file.size > MAX_PREVIEW_BYTES ||
        typeof farmId !== "string" || !farmId || form.get("confirm") !== "CONFIRMO_IMPORTAR") {
      return NextResponse.json({ error: "IMPORT_CONFIRMATION_REQUIRED" }, { status: 400, headers });
    }
    const raw = form.get("mapping");
    let mapping: MappingOverrides = {};
    if (raw !== null) {
      if (typeof raw !== "string" || raw.length > 2000) throw new Error("INVALID_COLUMN_MAPPING");
      const object: unknown = JSON.parse(raw);
      if (!object || typeof object !== "object" || Array.isArray(object) ||
          Object.entries(object).some(([key, value]) => !(key in IMPORT_FIELDS) ||
          !(value === null || (typeof value === "number" && Number.isSafeInteger(value))))) {
        throw new Error("INVALID_COLUMN_MAPPING");
      }
      mapping = object as MappingOverrides;
    }
    const granted=await allowedFarmIds(context.tenant.id,context.user.id,context.membership.role);
    if(granted&&!granted.includes(farmId))return NextResponse.json({error:"FARM_ACCESS_DENIED"},{status:403,headers});
    const result = await commitLivestockImport({ tenantId: context.tenant.id, actorUserId: context.user.id,
      farmId, bytes: new Uint8Array(await file.arrayBuffer()), filename: file.name, mapping });
    return NextResponse.json({ status: "IMPORTED", ...result }, { headers });
  } catch (error) {
    const code = error instanceof Error ? error.message : "IMPORT_FAILED";
    const allowed = ["INVALID_COLUMN_MAPPING", "IMPORT_HAS_VALIDATION_ERRORS", "IMPORT_DUPLICATE_ANIMALS",
      "FARM_NOT_FOUND", "UNKNOWN_PRODUCTIVE_LINE", "INVALID_BIRTH_DATE", "DUPLICATE_COLUMN_MAPPING",
      "ANIMAL_CODE_HEADER_REQUIRED", "UNSAFE_PREVIEW_ARCHIVE", "INVALID_PREVIEW_WORKBOOK"];
    return NextResponse.json({ error: allowed.includes(code) ? code : "IMPORT_FAILED" },
      { status: code === "IMPORT_DUPLICATE_ANIMALS" ? 409 : 400, headers });
  }
}
