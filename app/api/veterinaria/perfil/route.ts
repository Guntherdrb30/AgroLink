import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { recordAccessAudit } from "@/server/services/access-audit-service";
export const dynamic="force-dynamic";
const send=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{"Cache-Control":"private, no-store"}});
const schema=z.object({
 userId:z.string().min(1).max(100),
 fullName:z.string().trim().min(3).max(160),
 licenseNumber:z.string().trim().min(2).max(100),
 registrationAuthority:z.string().trim().max(160).optional(),
 specialty:z.string().trim().max(160).optional(),
 phone:z.string().trim().max(40).optional(),
});
export async function GET(request:Request){
 const c=await getCurrentTenant();
 if(!c||!["TENANT_OWNER","TENANT_ADMIN","VETERINARIAN"].includes(c.membership.role))return send({error:"Sin permiso"},403);
 const id=new URL(request.url).searchParams.get("userId")||c.user.id;
 if(id!==c.user.id&&!["TENANT_OWNER","TENANT_ADMIN"].includes(c.membership.role))return send({error:"Sin permiso"},403);
 const profile=await prisma.veterinaryProfessionalProfile.findUnique({where:{tenantId_userId:{tenantId:c.tenant.id,userId:id}}});
 return send({profile});
}
export async function PUT(request:Request){
 const c=await getCurrentTenant();
 if(!c||!["TENANT_OWNER","TENANT_ADMIN","VETERINARIAN"].includes(c.membership.role))return send({error:"Sin permiso"},403);
 if(request.headers.get("origin")!==new URL(request.url).origin)return send({error:"Origen no autorizado"},403);
 const raw=await request.text();if(raw.length>2500)return send({error:"Datos demasiado extensos"},413);
 let parsed;try{parsed=schema.safeParse(JSON.parse(raw))}catch{return send({error:"Datos invalidos"},400)}
 if(!parsed.success)return send({error:"Completa nombre y numero de registro profesional"},422);
 const {userId,...values}=parsed.data;
 if(userId!==c.user.id&&!["TENANT_OWNER","TENANT_ADMIN"].includes(c.membership.role))return send({error:"No puedes modificar otra ficha"},403);
 const member=await prisma.tenantMembership.findUnique({where:{tenantId_userId:{tenantId:c.tenant.id,userId}},select:{role:true}});
 if(member?.role!=="VETERINARIAN")return send({error:"El usuario no tiene rol veterinario en esta empresa"},403);
 const profile=await prisma.veterinaryProfessionalProfile.upsert({
 where:{tenantId_userId:{tenantId:c.tenant.id,userId}},
 create:{tenantId:c.tenant.id,userId,...values,updatedById:c.user.id},
 update:{...values,updatedById:c.user.id},
 select:{id:true,userId:true,fullName:true,licenseNumber:true,registrationAuthority:true,specialty:true,phone:true,updatedAt:true},
 });
 await recordAccessAudit({action:"VETERINARIAN_PROFILE_UPSERTED",tenantId:c.tenant.id,userId:c.user.id,metadata:{professionalUserId:userId,profileId:profile.id}});
 return send({profile,note:"Datos declarados. La colegiacion no ha sido verificada contra un registro oficial."});
}