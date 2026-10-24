import { NextResponse } from "next/server";
import { getCurrentTenant } from "@/lib/auth/session";
import { loadSale, confirmInternalSale } from "@/server/services/livestock-sale-service";
export const dynamic="force-dynamic";export const runtime="nodejs";
type Context={params:Promise<{saleId:string}>};
const send=(x:unknown,s=200)=>NextResponse.json(x,{status:s,headers:{"Cache-Control":"private, no-store"}});
export async function GET(_:Request,{params}:Context){
 const ctx=await getCurrentTenant();if(!ctx)return send({error:"Sin sesión"},401);
 const s=await loadSale(ctx,(await params).saleId);if(!s)return send({error:"No encontrada"},404);
 return send({sale:{...s,totalWeightKg:s.totalWeightKg.toString(),items:s.items.map(i=>({...i,weightKg:i.weightKg.toString()}))}});
}
export async function POST(request:Request,{params}:Context){
 const ctx=await getCurrentTenant();if(!ctx)return send({error:"Sin sesión"},401);
 const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return send({error:"Origen inválido"},403);
 let body;try{body=await request.json()}catch{return send({error:"Datos inválidos"},400)}
 try{return send(await confirmInternalSale(ctx,(await params).saleId,body?.confirm===true))}
 catch(e){const error=e instanceof Error?e.message:"Error";return send({error},["SALE_ROLE_DENIED","FARM_DENIED"].includes(error)?403:409)}
}