import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentTenant } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ userId: string }> };
const send = (body: unknown, status = 200) => NextResponse.json(body, {
  status, headers: { "Cache-Control": "private, no-store" },
});
const assignedRoles = ["FARM_MANAGER", "ACCOUNTING", "VETERINARIAN", "OPERATOR"] as const;
const editableRoles = ["TENANT_ADMIN", ...assignedRoles] as const;

async function actorAndTarget(userId: string) {
  const ctx = await getCurrentTenant();
  if (!ctx || !["TENANT_OWNER", "TENANT_ADMIN"].includes(ctx.membership.role)) return null;
  if (ctx.user.id === userId) return null;
  const member = await prisma.tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId: ctx.tenant.id, userId } },
    select: { role: true, userId: true },
  });
  if (!member || member.role === "TENANT_OWNER" ||
      (ctx.membership.role !== "TENANT_OWNER" && member.role === "TENANT_ADMIN")) return null;
  return { ctx, member };
}

export async function PATCH(request: Request, { params }: Context) {
  const { userId } = await params;
  const result = await actorAndTarget(userId);
  if (!result) return send({ error: "No puedes modificar este miembro" }, 403);
  if (request.headers.get("origin") !== new URL(request.url).origin) return send({ error: "Origen inválido" }, 403);
  const raw = await request.text();
  if (raw.length > 4000) return send({ error: "Datos excesivos" }, 413);
  let data: { role?: unknown; farmIds?: unknown };
  try { data = JSON.parse(raw); } catch { return send({ error: "Datos inválidos" }, 400); }
  const role = typeof data.role === "string" ? data.role : "";
  if (!editableRoles.includes(role as typeof editableRoles[number]) ||
      (role === "TENANT_ADMIN" && result.ctx.membership.role !== "TENANT_OWNER"))
    return send({ error: "Rol no autorizado" }, 403);
  const farmIds = Array.isArray(data.farmIds) && data.farmIds.every((x:unknown) => typeof x==="string")
    ? [...new Set(data.farmIds as string[])] : [];
  if ((role !== "TENANT_ADMIN" && farmIds.length < 1) || farmIds.length > 100)
    return send({ error: "Asigna al menos una finca válida" }, 422);
  const count = await prisma.farm.count({where: {tenantId:result.ctx.tenant.id,id:{in:farmIds}}});
  if(count!==farmIds.length) return send({error:"Finca ajena a la empresa"},403);
  try {
    await prisma.$transaction(async tx => {
      const existing = await tx.tenantMembership.findUnique({
        where: {tenantId_userId:{tenantId:result.ctx.tenant.id,userId}}, select:{role:true}
      });
      if (!existing || existing.role==="TENANT_OWNER" ||
          (result.ctx.membership.role!=="TENANT_OWNER" && existing.role==="TENANT_ADMIN"))
        throw Error("MEMBER_NOT_ALLOWED");
      await tx.tenantMembership.update({
        where:{tenantId_userId:{tenantId:result.ctx.tenant.id,userId}},
        data:{role:role as typeof editableRoles[number]},
      });
      await tx.tenantFarmAccess.deleteMany({where:{tenantId:result.ctx.tenant.id,userId}});
      if (role!=="TENANT_ADMIN" && farmIds.length)
        await tx.tenantFarmAccess.createMany({data:farmIds.map(farmId=>({tenantId:result.ctx.tenant.id,userId,farmId}))});
      await tx.auditLog.create({data:{tenantId:result.ctx.tenant.id,actorUserId:result.ctx.user.id,
        entityType:"TenantMembership",entityId:userId,action:"MEMBER_SCOPE_UPDATED",
        metadata:{role,farms:role==="TENANT_ADMIN"?"ALL":farmIds}}});
    });
    return send({ok:true});
  } catch (error) {
    return send({error:"No se pudo cambiar el acceso. Vuelve a intentarlo."},409);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  const { userId } = await params;
  const result = await actorAndTarget(userId);
  if (!result) return send({error:"No puedes revocar este miembro"},403);
  if(request.headers.get("origin")!==new URL(request.url).origin)return send({error:"Origen inválido"},403);
  try {
    await prisma.$transaction(async tx=>{
      const m=await tx.tenantMembership.findUnique({
        where:{tenantId_userId:{tenantId:result.ctx.tenant.id,userId}},select:{role:true},
      });
      if(!m||m.role==="TENANT_OWNER"||(m.role==="TENANT_ADMIN"&&result.ctx.membership.role!=="TENANT_OWNER"))throw Error("MEMBER_NOT_ALLOWED");
      await tx.tenantFarmAccess.deleteMany({where:{tenantId:result.ctx.tenant.id,userId}});
      await tx.tenantMembership.delete({where:{tenantId_userId:{tenantId:result.ctx.tenant.id,userId}}});
      await tx.user.updateMany({where:{id:userId,defaultTenantId:result.ctx.tenant.id},data:{defaultTenantId:null}});
      await tx.auditLog.create({data:{tenantId:result.ctx.tenant.id,actorUserId:result.ctx.user.id,
        entityType:"TenantMembership",entityId:userId,action:"MEMBER_ACCESS_REVOKED"}});
    });
    return send({ok:true});
  } catch { return send({error:"No se pudo revocar el acceso"},409); }
}
