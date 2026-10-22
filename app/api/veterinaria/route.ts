import { NextResponse } from "next/server";
import { getCurrentTenant } from "@/lib/auth/session";
import { allowedFarmIds } from "@/lib/permissions/farm-access";
import { prisma } from "@/lib/db/prisma";
export const dynamic="force-dynamic";
const send=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{"Cache-Control":"private, no-store"}});
export async function GET(request:Request) {
 const ctx=await getCurrentTenant();
 if(!ctx||!["TENANT_OWNER","TENANT_ADMIN","VETERINARIAN"].includes(ctx.membership.role))return send({error:"Sin acceso sanitario"},403);
 const scoped=await allowedFarmIds(ctx.tenant.id,ctx.user.id,ctx.membership.role);
 const farmId=new URL(request.url).searchParams.get("farmId");
 if(!farmId||scoped&&!scoped.includes(farmId))return send({error:"Finca no autorizada"},403);
 const farm=await prisma.farm.findFirst({where:{id:farmId,tenantId:ctx.tenant.id},select:{id:true,name:true}});
 if(!farm)return send({error:"Finca no disponible"},404);
 const animals=await prisma.animal.findMany({
  where:{tenantId:ctx.tenant.id,farmId},
  select:{id:true,internalCode:true,visualIdentification:true,sex:true,healthStatus:true,reproductiveStatus:true,chipCode:true,
   vaccinationRecords:{select:{id:true,vaccineName:true,appliedAt:true,nextDueAt:true,note:true},orderBy:{appliedAt:"desc"},take:5},
   treatmentRecords:{select:{id:true,treatmentName:true,appliedAt:true,diagnosis:true,withdrawalUntil:true},orderBy:{appliedAt:"desc"},take:5}},
  orderBy:{internalCode:"asc"},take:500,
 });
 return send({farm,animals,note:"Consulta sanitaria de solo lectura; no incluye finanzas, ventas ni historiales administrativos."});
}
