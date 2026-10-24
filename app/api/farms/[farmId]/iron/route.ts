import { NextResponse } from "next/server";
import { getCurrentTenant } from "@/lib/auth/session";
import { allowedFarmIds } from "@/lib/permissions/farm-access";
import { prisma } from "@/lib/db/prisma";
import { storeFile } from "@/server/services/file-storage-service";
export const dynamic="force-dynamic";export const runtime="nodejs";
type Params={params:Promise<{farmId:string}>};
const json=(v:unknown,status=200)=>NextResponse.json(v,{status,headers:{"Cache-Control":"private, no-store"}});
export async function POST(request:Request,{params}:Params){
 const ctx=await getCurrentTenant();if(!ctx)return json({error:"Sin sesión"},401);
 if(!["TENANT_OWNER","TENANT_ADMIN","FARM_MANAGER"].includes(ctx.membership.role))return json({error:"Sin permiso"},403);
 const origin=request.headers.get("origin");
 if(origin&&origin!==new URL(request.url).origin)return json({error:"Origen no autorizado"},403);
 const farmId=(await params).farmId;
 const allowed=await allowedFarmIds(ctx.tenant.id,ctx.user.id,ctx.membership.role);
 if(allowed&&!allowed.includes(farmId))return json({error:"Finca no autorizada"},403);
 const farm=await prisma.farm.findFirst({where:{id:farmId,tenantId:ctx.tenant.id},select:{id:true}});
 if(!farm)return json({error:"Finca no encontrada"},404);
 const contentLength=Number(request.headers.get("content-length")||0);
 if(contentLength>3_500_000)return json({error:"Archivo demasiado grande"},413);
 const data=await request.formData();
 const iron=data.get("ironCode"),file=data.get("file");
 if(typeof iron!=="string"||iron.length>80)return json({error:"Código de hierro inválido"},422);
 const code=iron.trim();
 if(!code&&!(file instanceof File&&file.size>0))return json({error:"Indica código o imagen del hierro"},422);
 let savedId:string|null=null;
 if(file instanceof File&&file.size>0){
  if(file.size>3_500_000||!["image/png","image/jpeg"].includes(file.type))return json({error:"Sube una imagen PNG o JPEG de hasta 3,5 MB"},422);
  const bytes=new Uint8Array(await file.arrayBuffer());
  const signature=file.type==="image/png"
    ? bytes.length>=8&&[137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n)
    : bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  if(!signature)return json({error:"El archivo no es una imagen válida"},415);
  const safeFile=new File([bytes],file.name.slice(0,90),{type:file.type});
  const stored=await storeFile({tenantId:ctx.tenant.id,uploadedById:ctx.user.id,file:safeFile,usage:"farm_iron",entityType:"farm",entityId:farmId,label:"Hierro de finca"});
  savedId=stored.id;
 }
 const updated=await prisma.farm.updateMany({where:{id:farmId,tenantId:ctx.tenant.id},data:{...(code?{ironCode:code}:{}),...(savedId?{ironFileId:savedId}:{})}});
 if(updated.count!==1)return json({error:"No se pudo guardar el hierro"},409);
 await prisma.auditLog.create({data:{tenantId:ctx.tenant.id,actorUserId:ctx.user.id,entityType:"FARM",entityId:farmId,action:"IRON_UPDATED",metadata:{hasImage:!!savedId}}});
 return json({ok:true});
}