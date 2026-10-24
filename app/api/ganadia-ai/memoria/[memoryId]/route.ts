import {NextResponse} from "next/server";
import {makeAiContext} from "@/lib/ai/ganadia-tools";
import {allowedAiTools} from "@/lib/ai/ganadia-policy";
import {
 reviseEliteFact,deleteEliteFact,modifyCompanyMemory,deleteCompanyMemory,
} from "@/lib/ai/ganadia-elite-memory";
export const dynamic="force-dynamic";export const runtime="nodejs";
type Params={params:Promise<{memoryId:string}>};
const send=(v:unknown,s=200)=>NextResponse.json(v,{status:s,headers:{"Cache-Control":"private, no-store"}});
const status=(code:string)=>code==="MEMORY_ROLE_DENIED"||code==="MEMORY_FARM_DENIED"?403:
 code==="MEMORY_NOT_FOUND"?404:422;
const originOK=(r:Request)=>!r.headers.get("origin")||r.headers.get("origin")===new URL(r.url).origin;
async function ctx(){
 const c=await makeAiContext();return c&&allowedAiTools(c.ctx.membership.role).length?c:null;
}
export async function PATCH(request:Request,{params}:Params){
 const c=await ctx();if(!c)return send({error:"Sin sesión"},401);
 if(!originOK(request))return send({error:"Origen inválido"},403);
 const {memoryId}=await params;if(!/^[a-zA-Z0-9_-]{8,120}$/.test(memoryId))return send({error:"ID inválido"},400);
 try{
  const raw=await request.text();if(raw.length>1700)throw Error("MEMORY_BAD_REQUEST");
  const obj=JSON.parse(raw);if(!obj||typeof obj!=="object"||Array.isArray(obj))throw Error("MEMORY_BAD_REQUEST");
  const {scope,...changes}=obj;
  return send(scope==="personal"?await reviseEliteFact(c,memoryId,changes):scope==="organization"?await modifyCompanyMemory(c,memoryId,changes):(()=>{throw Error("MEMORY_BAD_REQUEST")})());
 }catch(e){const code=e instanceof Error?e.message:"MEMORY_BAD_REQUEST";return send({error:code},status(code));}
}
export async function DELETE(request:Request,{params}:Params){
 const c=await ctx();if(!c)return send({error:"Sin sesión"},401);
 if(!originOK(request))return send({error:"Origen inválido"},403);
 const {memoryId}=await params;if(!/^[a-zA-Z0-9_-]{8,120}$/.test(memoryId))return send({error:"ID inválido"},400);
 try{
  const scope=new URL(request.url).searchParams.get("scope");
  return send(scope==="personal"?await deleteEliteFact(c,memoryId):scope==="organization"?await deleteCompanyMemory(c,memoryId):(()=>{throw Error("MEMORY_BAD_REQUEST")})());
 }catch(e){const code=e instanceof Error?e.message:"MEMORY_BAD_REQUEST";return send({error:code},status(code));}
}
