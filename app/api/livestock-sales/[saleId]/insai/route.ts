import { getCurrentTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { allowedFarmIds } from "@/lib/permissions/farm-access";
import { storeFile } from "@/server/services/file-storage-service";
import { NextResponse } from "next/server";
export const dynamic="force-dynamic";export const runtime="nodejs";
type Context={params:Promise<{saleId:string}>};
const send=(x:unknown,s=200)=>NextResponse.json(x,{status:s,headers:{"Cache-Control":"private, no-store"}});
export async function POST(request:Request,{params}:Context){
 const ctx=await getCurrentTenant();if(!ctx)return send({error:"Sin sesión"},401);
 if(!["TENANT_OWNER","TENANT_ADMIN","FARM_MANAGER"].includes(ctx.membership.role))return send({error:"Sin permiso"},403);
 const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return send({error:"Origen inválido"},403);
 const id=(await params).saleId;
 const sale=await prisma.livestockSale.findFirst({where:{id,tenantId:ctx.tenant.id},select:{id:true,farmId:true,insaiPermitFileId:true}});
 if(!sale)return send({error:"Venta inexistente"},404);
 const grants=await allowedFarmIds(ctx.tenant.id,ctx.user.id,ctx.membership.role);
 if(grants&&!grants.includes(sale.farmId))return send({error:"Finca no autorizada"},403);
 if(sale.insaiPermitFileId)return send({error:"Ya existe un soporte. Contacta al administrador antes de reemplazarlo."},409);
 const data=await request.formData();
 const file=data.get("file"),permitNo=data.get("permitNumber");
 if(!(file instanceof File)||file.size>15*1024*1024||!["application/pdf","image/jpeg","image/png","image/webp"].includes(file.type)||typeof permitNo!=="string"||!permitNo.trim()||permitNo.length>120)return send({error:"Archivo o número de guía inválido"},422);
 const stored=await storeFile({tenantId:ctx.tenant.id,uploadedById:ctx.user.id,file,usage:"sale_permit",entityType:"livestock_sale",entityId:id,label:"Soporte INSAI "+permitNo.trim()});
 const updated=await prisma.livestockSale.updateMany({where:{id,tenantId:ctx.tenant.id,insaiPermitFileId:null},data:{insaiPermitFileId:stored.id,insaiPermitNumber:permitNo.trim(),insaiPermitAttachedAt:new Date()}});
 if(updated.count!==1)return send({error:"Soporte guardado, pero el registro cambió; requiere revisión."},409);
 await prisma.auditLog.create({data:{tenantId:ctx.tenant.id,actorUserId:ctx.user.id,entityType:"LIVESTOCK_SALE",entityId:id,action:"INSAI_ATTACHED",metadata:{fileId:stored.id}}});
 return send({ok:true,fileId:stored.id});
}
