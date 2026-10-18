import { NextResponse } from "next/server";
import { getCurrentTenant } from "@/lib/auth/session";
import { previewLivestockWorkbook, MAX_PREVIEW_BYTES } from "@/lib/imports/livestock-preview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const context = await getCurrentTenant();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["TENANT_OWNER", "TENANT_ADMIN", "FARM_MANAGER"].includes(context.membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_PREVIEW_BYTES + 100_000) {
    return NextResponse.json({ error: "File too large" }, { status: 413 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const farmId = formData.get("farmId");
    if (!(file instanceof File) || typeof farmId !== "string" || !farmId) {
      return NextResponse.json({ error: "File and farm required" }, { status: 400 });
    }
    if (file.size > MAX_PREVIEW_BYTES || file.size === 0) {
      return NextResponse.json({ error: "File too large or empty" }, { status: 413 });
    }
    const farm = await (await import("@/lib/db/prisma")).prisma.farm.findFirst({
      where: { id: farmId, tenantId: context.tenant.id },
      select: { id: true, name: true },
    });
    if (!farm) return NextResponse.json({ error: "Farm not found" }, { status: 404 });
    const preview = previewLivestockWorkbook(new Uint8Array(await file.arrayBuffer()), file.name);
    return NextResponse.json({ farm, ...preview }, {
      headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "PREVIEW_FAILED";
    const safe = [
      "INVALID_PREVIEW_FILE_SIZE", "UNSUPPORTED_PREVIEW_EXTENSION",
      "INVALID_PREVIEW_WORKBOOK", "EMPTY_PREVIEW_WORKBOOK", "ANIMAL_CODE_HEADER_REQUIRED",
    ].includes(code) ? code : "PREVIEW_FAILED";
    return NextResponse.json({ error: safe }, { status: 400, headers: { "Cache-Control": "private, no-store" } });
  }
}
