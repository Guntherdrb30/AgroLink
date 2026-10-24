import {NextResponse} from "next/server";
import {makeAiContext} from "@/lib/ai/ganadia-tools";
import {allowedAiTools} from "@/lib/ai/ganadia-policy";
import {getEliteProfile} from "@/lib/ai/ganadia-elite-memory";
export const dynamic="force-dynamic";export const runtime="nodejs";
export async function GET(){
 const ctx=await makeAiContext();
 if(!ctx||!allowedAiTools(ctx.ctx.membership.role).length)return NextResponse.json({error:"No autorizado"},{status:401});
 try{
  const data=await getEliteProfile(ctx);
  const bytes=JSON.stringify({version:1,exportedAt:new Date().toISOString(),settings:data.settings,facts:data.facts,patterns:data.patterns},null,2);
  return new Response(bytes,{headers:{
   "Content-Type":"application/json; charset=utf-8",
   "Content-Disposition":'attachment; filename="GanadIA-Mi-Memoria.json"',
   "Cache-Control":"private, no-store",
   "X-Content-Type-Options":"nosniff",
  }});
 }catch{return NextResponse.json({error:"No se pudo exportar tu memoria"},{status:503});}
}
