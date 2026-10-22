import { get } from "@vercel/blob";
import { getCurrentTenant } from "@/lib/auth/session";
import { allowedFarmIds } from "@/lib/permissions/farm-access";
import { prisma } from "@/lib/db/prisma";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
export async function GET(_request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const viewer = await getCurrentTenant();
  if (!viewer) return new Response("Unauthorized", { status: 401, headers });
  if(viewer.membership.role==="ACCOUNTING")return new Response("Not found",{status:404,headers});
  const { fileId } = await params;
  const file = await prisma.fileStorage.findFirst({
    where: { id: fileId, tenantId: viewer.tenant.id, visibility: "PRIVATE",
      usage: { in: ["FARM_PRIMARY_IMAGE", "FARM_LOGO"] } },
  });
  if (!file || file.entityType !== "farm" || !file.entityId ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.mimeType) ||
      !file.path.startsWith(`agrolynk/tenants/${viewer.tenant.id}/private/farms/`)) {
    return new Response("Not found", { status: 404, headers });
  }
  const farm = await prisma.farm.findFirst({
    where: { id: file.entityId, tenantId: viewer.tenant.id,
      OR: [{ primaryImageFileId: file.id }, { logoFileId: file.id }] }, select: { id: true },
  });
  if (!farm) return new Response("Not found", { status: 404, headers });
  const granted=await allowedFarmIds(viewer.tenant.id,viewer.user.id,viewer.membership.role);
  if(granted&&!granted.includes(farm.id))return new Response("Not found",{status:404,headers});
  try {
    const blob = await get(file.path, { access: "private", token: process.env.BLOB_READ_WRITE_TOKEN });
    if (!blob || blob.statusCode !== 200) return new Response("Not found", { status: 404, headers });
    return new Response(blob.stream, { headers: { ...headers, "Content-Type": file.mimeType,
      "Content-Disposition": "inline", "Content-Security-Policy": "default-src 'none'; sandbox" } });
  } catch {
    return new Response("Storage unavailable", { status: 503, headers });
  }
}
