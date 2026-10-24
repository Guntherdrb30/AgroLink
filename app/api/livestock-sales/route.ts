import { NextResponse } from "next/server";
import { getCurrentTenant } from "@/lib/auth/session";
import { allowedFarmIds } from "@/lib/permissions/farm-access";
import { prisma } from "@/lib/db/prisma";
import { makeSaleDraft } from "@/server/services/livestock-sale-service";
export const dynamic="force-dynamic";export const runtime="nodejs";
const send=(x:unknown,s=200)=>NextResponse.json(x,{status:s,headers:{"Cache-Control":"private, no-store"}});
export async function GET(){
 const ctx=await getCurrentTenant();if(!ctx)return send({error:"Sin sesión"},401);
 if(!["TENANT_OWNER","TENANT_ADMIN","FARM_MANAGER","ACCOUNTING"].includes(ctx.membership.role))return send({error:"Sin permiso"},403);
 const allowed=await allowedFarmIds(ctx.tenant.id,ctx.user.id,ctx.membership.role);
 const sales=await prisma.livestockSale.findMany({where:{tenantId:ctx.tenant.id,...(allowed?{farmId:{in:allowed}}:{})},select:{id:true,number:true,farmId:true,status:true,buyerName:true,totalWeightKg:true,totalCents:true,currency:true,createdAt:true,insaiPermitNumber:true,_count:{select:{items:true}}},orderBy:{createdAt:"desc"},take:100});
 return send({sales:sales.map(s=>({...s,totalWeightKg:s.totalWeightKg.toString()}))});
}
export async function POST(request:Request){
 const ctx=await getCurrentTenant();if(!ctx)return send({error:"Sin sesión"},401);
 const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return send({error:"Origen inválido"},403);
 const raw=await request.text();if(raw.length>30000)return send({error:"Petición excesiva"},413);
 let body;try{body=JSON.parse(raw)}catch{return send({error:"Datos inválidos"},400)}
 try{const data=await makeSaleDraft(ctx,body);return send(data,data.duplicate?200:201)}
 catch(e){const error=e instanceof Error?e.message:"Error";return send({error},["FARM_DENIED","SALE_ROLE_DENIED"].includes(error)?403:409)}
}