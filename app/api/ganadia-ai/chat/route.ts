import { NextResponse } from "next/server";
import { makeAiContext,runAiTool } from "@/lib/ai/ganadia-tools";
import { isAuthorizedAiTool,type AiToolName, isPaidAiEnabled } from "@/lib/ai/ganadia-policy";
export const dynamic="force-dynamic";
export const runtime="nodejs";
const send=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{"Cache-Control":"private, no-store"}});
const topics:Record<string,AiToolName>={fincas:"listar_fincas",ganado:"resumen_ganado",sanidad:"resumen_sanidad",finanzas:"resumen_finanzas",venta:"preseleccionar_venta"};
function resolve(message:string,role:string):AiToolName|null{
 const m=message.toLocaleLowerCase("es-VE");
 if(/(vender|venta|precio de venta|listos para vender)/.test(m))return "preseleccionar_venta";
 if(/(cu[aá]ntas fincas|mis fincas|lista de fincas|qu[eé] fincas)/.test(m))return "listar_fincas";
 if(/(gastos|ingresos|finanzas|cuentas por cobrar|cuentas por pagar|balance|deudas|facturaci[oó]n)/.test(m))return "resumen_finanzas";
 if(/(vacunas|vacunaci[oó]n|sanidad|enferm|salud|tratamientos|veterinari)/.test(m))return "resumen_sanidad";
 if(/(ganado|animales|peso|inventario|reses|cabezas)/.test(m))return "resumen_ganado";
 if(role==="ACCOUNTING")return "resumen_finanzas";
 if(role==="VETERINARIAN")return "resumen_sanidad";
 return null;
}
export async function POST(request:Request){
 const ctx=await makeAiContext();
 if(!ctx)return send({error:"Necesitas iniciar sesión y pertenecer a una empresa."},401);
 const origin=request.headers.get("origin");
 if(origin&&origin!==new URL(request.url).origin)return send({error:"Origen no autorizado"},403);
 if(!request.headers.get("content-type")?.startsWith("application/json"))return send({error:"Formato no admitido"},415);
 const raw=await request.text();if(raw.length>5000)return send({error:"Consulta demasiado larga"},413);
 let body:{message?:unknown;topic?:unknown;farmId?:unknown;minWeightKg?:unknown};
 try{body=JSON.parse(raw)}catch{return send({error:"Solicitud inválida"},400)}
 const message=typeof body.message==="string"?body.message.trim().slice(0,700):"";
 const topic=typeof body.topic==="string"?body.topic:"";
 const tool=(topics[topic]||resolve(message,ctx.ctx.membership.role)) as AiToolName|null;
 const farmId=typeof body.farmId==="string"&&body.farmId.length<120?body.farmId:null;
 const weight=typeof body.minWeightKg==="number"?body.minWeightKg:
  Number(message.match(/(?:m[aá]s de|al menos|m[ií]nimo|desde)\s*(\d{2,4})\s*(?:kg|kilos)/i)?.[1]||450);
 if(!tool)return send({reply:"Puedo consultar tus fincas, ganado, sanidad, finanzas o preparar una preselección de venta. ¿Qué necesitas revisar? Esta versión de prueba aún no utiliza OpenAI.",farms:ctx.farms,mode:"asistido"});
 if(!isAuthorizedAiTool(ctx.ctx.membership.role,tool))return send({error:"Tu perfil no tiene acceso a esa información."},403);
 try{
  const result=await runAiTool(ctx,tool,{farmId,minWeightKg:weight});
  return send({reply:result.text,tool,farms:ctx.farms,mode:"asistido",paidAiAvailable:isPaidAiEnabled({enabled:process.env.GANADIA_AI_PAID_ENABLED,approved:process.env.GANADIA_AI_COST_APPROVED,keyPresent:!!process.env.OPENAI_API_KEY})});
 }catch(e){
  if(e instanceof Error&&e.message==="FARM_DENIED")return send({error:"No tienes permiso para esa finca."},403);
  if(e instanceof Error&&e.message==="INVALID_WEIGHT")return send({error:"Introduce un peso mínimo entre 1 y 2000 kg."},422);
  return send({error:"La consulta no pudo completarse."},500);
 }
}
