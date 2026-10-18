import { NextResponse } from "next/server";
import { getCurrentTenant } from "@/lib/auth/session";
import { previewLivestockWorkbook, MAX_PREVIEW_BYTES, IMPORT_FIELDS, type MappingOverrides } from "@/lib/imports/livestock-preview";

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
    let overrides: MappingOverrides = {};
    const mappingRaw = formData.get("mapping");
    if (typeof mappingRaw === "string" && mappingRaw.length < 2000) {
      let parsed: unknown;
      try { parsed = JSON.parse(mappingRaw); } catch { return NextResponse.json({ error: "INVALID_COLUMN_MAPPING" }, { status: 400 }); }
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return NextResponse.json({ error: "INVALID_COLUMN_MAPPING" }, { status: 400 });
      const entries = Object.entries(parsed);
      if (entries.some(([key, value]) => !(key in IMPORT_FIELDS) || !(value === null || Number.isSafeInteger(value)))) {
        return NextResponse.json({ error: "INVALID_COLUMN_MAPPING" }, { status: 400 });
      }
      overrides = Object.fromEntries(entries) as MappingOverrides;
    }
    const preview = await previewLivestockWorkbook(new Uint8Array(await file.arrayBuffer()), file.name, overrides);
    const uploadedCodes = [...new Set(preview.candidateCodes.map(r => r.code.trim()).filter(Boolean))];
    const existing = await (await import("@/lib/db/prisma")).prisma.animal.findMany({
      where: { tenantId: context.tenant.id, internalCode: { in: uploadedCodes } },
      select: { internalCode: true },
    });
    // Animal codes are tenant-unique: importing one from another farm must also be blocked.
    const matched = new Set(existing.map(a => a.internalCode.trim().toLowerCase()));
    const dupes = preview.candidateCodes.filter(r => matched.has(r.code.trim().toLowerCase()));
    for (const row of dupes) {
      const issue = { row: row.row, field: "codigo", code: "EXISTS_IN_TENANT" };
      if (preview.issues.length < 100) preview.issues.push(issue);
      const visible = preview.previewRows.find(r => r.sourceRow === row.row);
      if (visible) visible.issues.push(issue);
    }
    preview.issueCount += dupes.length;
    preview.validRows = Math.max(0, preview.validRows - dupes.filter(r => r.valid).length);
    preview.checkedExistingCodes = true;
    // Do not expose internal full-batch codes beyond the first 20 preview rows.
    preview.candidateCodes = [];
    return NextResponse.json({ farm, ...preview }, {
      headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "PREVIEW_FAILED";
    const safe = [
      "INVALID_PREVIEW_FILE_SIZE", "UNSUPPORTED_PREVIEW_EXTENSION",
      "INVALID_PREVIEW_WORKBOOK", "EMPTY_PREVIEW_WORKBOOK", "ANIMAL_CODE_HEADER_REQUIRED", "INVALID_COLUMN_MAPPING", "DUPLICATE_COLUMN_MAPPING", "UNSAFE_PREVIEW_ARCHIVE",
    ].includes(code) ? code : "PREVIEW_FAILED";
    return NextResponse.json({ error: safe }, { status: 400, headers: { "Cache-Control": "private, no-store" } });
  }
}
