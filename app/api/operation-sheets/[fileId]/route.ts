import { get } from "@vercel/blob";
import { getCurrentTenant } from "@/lib/auth/session";
import { allowedFarmIds } from "@/lib/permissions/farm-access";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
export async function GET(_request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const current = await getCurrentTenant();
  if (!current) return new Response("Unauthorized", { status: 401, headers });
  if(["ACCOUNTING","VETERINARIAN"].includes(current.membership.role))return new Response("Not found",{status:404,headers});
  const { fileId } = await params;
  const file = await prisma.fileStorage.findFirst({
    where: { id: fileId, tenantId: current.tenant.id, usage: "OPERATION_SHEET", visibility: "PRIVATE" },
  });
  if (!file || file.entityType !== "livestock_operation" || !file.entityId ||
    !file.path.startsWith(`agrolynk/tenants/${current.tenant.id}/private/operations/sheets/`)) {
    return new Response("Not found", { status: 404, headers });
  }
  const sheet = await prisma.livestockOperationSheet.findFirst({
    where: { fileId: file.id, operationId: file.entityId, tenantId: current.tenant.id },
    select: { id: true },
  });
  if (!sheet || !["application/pdf", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"].includes(file.mimeType)) {
    return new Response("Not found", { status: 404, headers });
  }
  const operation=await prisma.livestockOperation.findFirst({where:{id:file.entityId,tenantId:current.tenant.id},select:{farmId:true}});
  if(!operation)return new Response("Not found",{status:404,headers});
  const granted=await allowedFarmIds(current.tenant.id,current.user.id,current.membership.role);
  if(granted&&!granted.includes(operation.farmId))return new Response("Not found",{status:404,headers});
  try {
    const blob = await get(file.path, { access: "private", token: process.env.BLOB_READ_WRITE_TOKEN });
    if (!blob || blob.statusCode !== 200) return new Response("Not found", { status: 404, headers });
    const suffix = file.mimeType === "application/pdf" ? "pdf" : "xlsx";
    return new Response(blob.stream, { headers: {
      ...headers, "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename="ganadia-jornada.${suffix}"`,
      "Content-Security-Policy": "sandbox",
    } });
  } catch { return new Response("No disponible", { status: 503, headers }); }
}
