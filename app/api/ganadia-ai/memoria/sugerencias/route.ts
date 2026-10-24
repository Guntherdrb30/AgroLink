import {NextResponse} from "next/server";
import {makeAiContext} from "@/lib/ai/ganadia-tools";
import {allowedAiTools} from "@/lib/ai/ganadia-policy";
import {proposeEliteMemoriesWithOpenAI} from "@/lib/ai/ganadia-elite-suggestions";
import {GanadiaPilotBudgetError} from "@/lib/ai/ganadia-budget";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(request:Request){
 const ctx=await makeAiContext();
 if(!ctx||!allowedAiTools(ctx.ctx.membership.role).length)return NextResponse.json({error:"No autorizado"},{status:401});
 const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return NextResponse.json({error:"Origen inválido"},{status:403});
 try{
  const count=await proposeEliteMemoriesWithOpenAI(ctx);
  return NextResponse.json({suggested:count},{headers:{"Cache-Control":"private, no-store"}});
 }catch(e){
  const code=e instanceof Error?e.message:"MEMORY_UNKNOWN";
  const status=code==="MEMORY_DISABLED"?403:code==="MEMORY_NO_CONVERSATION"?422:e instanceof GanadiaPilotBudgetError?429:503;
  const msg=code==="MEMORY_DISABLED"?"Activa la memoria y el aprendizaje antes de analizar consultas.":
   code==="MEMORY_NO_CONVERSATION"?"Conversa primero con GanadIA antes de pedir sugerencias.":
   e instanceof GanadiaPilotBudgetError?"La cuota piloto de OpenAI está agotada o no está disponible.":
   "No se pudieron analizar tus preferencias con OpenAI.";
  console.warn("GanadIA memory suggestion failed",code);
  return NextResponse.json({error:msg},{status,headers:{"Cache-Control":"private, no-store"}});
 }
}
