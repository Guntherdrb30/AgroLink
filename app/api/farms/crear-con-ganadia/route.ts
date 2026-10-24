import {NextResponse} from "next/server";
import {getCurrentTenant} from "@/lib/auth/session";
import {prisma} from "@/lib/db/prisma";
import {z} from "zod";
import {ORDER,QUESTIONS,parseReply,setupSchema,plan,type SetupStep} from "@/lib/farms/crea-tu-finca";
import {Prisma} from "@prisma/client";
export const dynamic="force-dynamic";export const runtime="nodejs";
const send=(v:unknown,s=200)=>NextResponse.json(v,{status:s,headers:{"Cache-Control":"private, no-store"}});
async function scope(){const c=await getCurrentTenant();return c&&["TENANT_OWNER","TENANT_ADMIN"].includes(c.membership.role)?c:null;}
const key=(c:NonNullable<Awaited<ReturnType<typeof scope>>>)=>({tenantId:c.tenant.id,userId:c.user.id});
function view(r:{status:string;step:string;version:number;answers:unknown;messages:unknown;proposal:unknown;createdFarmId:string|null}){return{status:r.status,step:r.step,version:r.version,answers:r.answers,history:r.messages,proposal:r.proposal,farmId:r.createdFarmId,question:QUESTIONS[r.step as SetupStep]??QUESTIONS.vision};}
export async function GET(){const c=await scope();if(!c)return send({error:"No autorizado"},403);const r=await prisma.farmSetupSession.findUnique({where:{tenantId_userId:key(c)}});return send(r?view(r):{status:"COLLECTING",step:"vision",version:0,answers:{},history:[],proposal:null,question:QUESTIONS.vision});}
const payload=z.discriminatedUnion("action",[
 z.object({action:z.literal("answer"),version:z.number().int().nonnegative(),text:z.string().min(1).max(1800)}),
 z.object({action:z.literal("reset"),version:z.number().int().nonnegative()}),
 z.object({action:z.literal("revise"),version:z.number().int().nonnegative(),field:z.enum(["vision","name","location","hectares","purpose","herd","land","goals"]),text:z.string().max(1800)}),
 z.object({action:z.literal("approve"),version:z.number().int().nonnegative(),confirm:z.literal(true)}),
]);
function sessionSource(x:string|null):string{return x==="OPENAI"?"OPENAI":"ASSISTED";}
export async function POST(request:Request){
 const c=await scope();if(!c)return send({error:"Solo un propietario o administrador puede crear fincas."},403);
 const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return send({error:"Origen inválido"},403);
 if(!request.headers.get("content-type")?.startsWith("application/json"))return send({error:"Formato inválido"},415);
 const raw=await request.text();if(raw.length>5000)return send({error:"Solicitud demasiado grande"},413);
 let data:unknown;try{data=JSON.parse(raw)}catch{return send({error:"JSON inválido"},400)}
 const parsed=payload.safeParse(data);if(!parsed.success)return send({error:"Solicitud no válida"},422);
 const input=parsed.data,k=key(c);
 try{
 const result=await prisma.$transaction(async tx=>{
   await tx.$queryRawUnsafe('SELECT "id" FROM "Tenant" WHERE "id"=$1 FOR UPDATE',k.tenantId);
   let r=await tx.farmSetupSession.findUnique({where:{tenantId_userId:k}});
   if(input.action==="reset"){
    if(r&&r.version!==input.version)return {code:409,data:{error:"El borrador cambió, actualiza la página."}};
    if(r?.status==="APPLIED")return {code:409,data:{error:"Esta finca ya fue creada."}};
    r=await tx.farmSetupSession.upsert({where:{tenantId_userId:k},create:{...k,version:1},update:{step:"vision",status:"COLLECTING",answers:{},messages:[],proposal:Prisma.DbNull,proposalSource:null,version:{increment:1}}});
    return {code:200,data:view(r)};
   }
   if(!r){
    if(input.version!==0)return {code:409,data:{error:"Recarga el borrador."}};
    r=await tx.farmSetupSession.create({data:{...k}});
   }
   if(r.version!==input.version)return {code:409,data:{error:"La sesión cambió. Actualiza para continuar."}};
   if(r.status==="APPLIED")return {code:200,data:view(r)};
   if(input.action==="approve"){
    if(r.status!=="REVIEW")return {code:409,data:{error:"Primero revisa la propuesta."}};
    const a=setupSchema.parse(r.answers);
    const baseline=plan(a);
    const reviewed=r.proposal&&typeof r.proposal==="object"&&!Array.isArray(r.proposal)?r.proposal as Record<string,unknown>:{};
    const suggested=Array.isArray(reviewed.recommendations)?reviewed.recommendations.filter((x):x is string=>typeof x==="string"&&x.trim().length>0&&x.length<=160).slice(0,9):[];
    const p={...baseline,recommendations:suggested.length?suggested:baseline.recommendations};
    const existing=await tx.farm.findFirst({where:{tenantId:k.tenantId,name:{equals:a.name,mode:"insensitive"}},select:{id:true}});
    if(existing)return {code:409,data:{error:"Ya existe una finca con ese nombre; modifica la propuesta."}};
    const farm=await tx.farm.create({data:{tenantId:k.tenantId,name:a.name,location:a.location,hectares:a.hectares,status:"PENDING_VERIFICATION",description:a.vision.slice(0,500)}});
    await tx.verificationProfile.create({data:{tenantId:k.tenantId,farmId:farm.id,subjectType:"FARM",subjectId:farm.id,status:"PENDING"}});
    await tx.farmProductionProfile.create({data:{tenantId:k.tenantId,farmId:farm.id,purpose:p.purpose,answers:a as Prisma.InputJsonValue,recommendedModules:p.modules,futureModules:p.futureModules,recommendations:p.recommendations,warnings:p.warnings,proposalSource:sessionSource(r.proposalSource),approvedById:k.userId}});
    await tx.auditLog.create({data:{tenantId:k.tenantId,actorUserId:k.userId,entityType:"FARM",entityId:farm.id,action:"GUIDED_FARM_CREATED",metadata:{purpose:p.purpose}}});
    const done=await tx.farmSetupSession.update({where:{id:r.id},data:{status:"APPLIED",step:"done",createdFarmId:farm.id,version:{increment:1}}});
    return {code:201,data:view(done)};
   }
   const a=r.answers&&typeof r.answers==="object"&&!Array.isArray(r.answers)?{...r.answers as Record<string,unknown>}:{};
   const step=input.action==="answer"?r.step:input.field;
   if(!ORDER.includes(step as SetupStep))return {code:409,data:{error:"Este paso ya fue completado."}};
   const value=parseReply(step as SetupStep,input.text);
   if(value===undefined)return {code:422,data:{error:step==="hectares"?"Indica la cantidad de hectáreas o escribe No sé.":step==="purpose"?"Elige cría, engorde, leche, doble propósito, agricultura o agropecuaria.":"Por favor, amplía o corrige tu respuesta."}};
   a[step]=value;
   const next=input.action==="answer"?ORDER[ORDER.indexOf(r.step as SetupStep)+1]??"review":"review";
   const complete=next==="review";
   if(complete&&!setupSchema.safeParse(a).success)return {code:422,data:{error:"Faltan datos para completar la propuesta."}};
   const p=complete?plan(setupSchema.parse(a)):null;
   const history=Array.isArray(r.messages)?r.messages.slice(-13):[];
   history.push({question:QUESTIONS[step as SetupStep],answer:input.text.slice(0,900)});
   const updated=await tx.farmSetupSession.update({where:{id:r.id},data:{answers:a as Prisma.InputJsonValue,messages:history as Prisma.InputJsonValue,step:next,status:complete?"REVIEW":"COLLECTING",proposal:p?p as Prisma.InputJsonValue:Prisma.DbNull,proposalSource:complete?"ASSISTED":null,version:{increment:1}}});
   return {code:200,data:view(updated)};
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:15000,maxWait:10000});
 return send(result.data,result.code);
 }catch(error){console.error("CREA_TU_FINCA_FAILED",error instanceof Error?error.name:"unknown");return send({error:"No fue posible guardar; vuelve a intentar sin crear duplicados."},503);}
}
