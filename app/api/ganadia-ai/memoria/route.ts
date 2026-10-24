import {NextResponse} from "next/server";
import {makeAiContext} from "@/lib/ai/ganadia-tools";
import {allowedAiTools} from "@/lib/ai/ganadia-policy";
import {
 getEliteProfile,updateEliteSettings,createEliteFact,
 createCompanyMemory,eraseElitePersonalMemory,
} from "@/lib/ai/ganadia-elite-memory";
export const dynamic="force-dynamic";export const runtime="nodejs";
const send=(v:unknown,status=200)=>NextResponse.json(v,{status,headers:{"Cache-Control":"private, no-store"}});
const errorStatus=(s:string)=>s==="MEMORY_ROLE_DENIED"||s==="MEMORY_FARM_DENIED"?403:
 s==="MEMORY_NOT_FOUND"?404:s==="MEMORY_DISABLED"?409:s==="MEMORY_LIMIT_REACHED"?429:422;
function allowedOrigin(request:Request){const origin=request.headers.get("origin");return !origin||origin===new URL(request.url).origin;}
async function context(){
 const ctx=await makeAiContext();
 return ctx&&allowedAiTools(ctx.ctx.membership.role).length?ctx:null;
}
async function body(request:Request):Promise<Record<string,unknown>>{
 if(!request.headers.get("content-type")?.startsWith("application/json"))throw Error("MEMORY_BAD_REQUEST");
 const raw=await request.text();
 if(!raw||raw.length>6500)throw Error("MEMORY_BAD_REQUEST");
 try{const data=JSON.parse(raw);if(!data||typeof data!=="object"||Array.isArray(data))throw Error();return data;}
 catch{throw Error("MEMORY_BAD_REQUEST");}
}
export async function GET(){
 const ctx=await context();if(!ctx)return send({error:"Inicia sesión para gestionar tu memoria."},401);
 try{return send(await getEliteProfile(ctx));}
 catch{return send({error:"No se pudo cargar la memoria."},503);}
}
export async function PATCH(request:Request){
 const ctx=await context();if(!ctx)return send({error:"No autorizado."},401);
 if(!allowedOrigin(request))return send({error:"Origen inválido."},403);
 try{return send({settings:await updateEliteSettings(ctx,await body(request))});}
 catch(e){const code=e instanceof Error?e.message:"MEMORY_BAD_REQUEST";return send({error:code},errorStatus(code));}
}
export async function POST(request:Request){
 const ctx=await context();if(!ctx)return send({error:"No autorizado."},401);
 if(!allowedOrigin(request))return send({error:"Origen inválido."},403);
 try{
  const input=await body(request);
  if(input.scope==="personal"){
   if(Object.keys(input).some(k=>!["scope","kind","content","farmId"].includes(k)))throw Error("MEMORY_BAD_REQUEST");
   const record=await createEliteFact(ctx,input);
   return send({id:record.id,status:record.status},201);
  }
  if(input.scope==="organization"){
   if(Object.keys(input).some(k=>!["scope","content","farmId"].includes(k)))throw Error("MEMORY_BAD_REQUEST");
   const record=await createCompanyMemory(ctx,input);
   return send({id:record.id},201);
  }
  throw Error("MEMORY_BAD_REQUEST");
 }catch(e){const code=e instanceof Error?e.message:"MEMORY_BAD_REQUEST";return send({error:code},errorStatus(code));}
}
export async function DELETE(request:Request){
 const ctx=await context();if(!ctx)return send({error:"No autorizado."},401);
 if(!allowedOrigin(request))return send({error:"Origen inválido."},403);
 try{const input=await body(request);return send(await eraseElitePersonalMemory(ctx,input.confirm));}
 catch(e){const code=e instanceof Error?e.message:"MEMORY_BAD_REQUEST";return send({error:code},errorStatus(code));}
}
