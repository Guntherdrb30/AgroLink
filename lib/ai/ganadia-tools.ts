import { getCurrentTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { allowedFarmIds } from "@/lib/permissions/farm-access";
import { allowedAiTools, isAuthorizedAiTool, scopeFarmIds, type AiToolName } from "@/lib/ai/ganadia-policy";
import { financeEs, saludEs, textoEs } from "@/lib/i18n/labels";

export type GanadiaContext = NonNullable<Awaited<ReturnType<typeof getCurrentTenant>>>;
export async function makeAiContext(){
 const ctx=await getCurrentTenant();
 if(!ctx) return null;
 const permitted=allowedAiTools(ctx.membership.role);
 const grants=await allowedFarmIds(ctx.tenant.id,ctx.user.id,ctx.membership.role);
 const farms=await prisma.farm.findMany({where:{tenantId:ctx.tenant.id,...(grants?{id:{in:grants}}:{})},select:{id:true,name:true},take:100,orderBy:{name:"asc"}});
 return {ctx,permitted,farms};
}
export type AiContext=NonNullable<Awaited<ReturnType<typeof makeAiContext>>>;
type Params={farmId?:string|null;minWeightKg?:number};
export async function runAiTool(session:AiContext,tool:AiToolName,args:Params={}):Promise<{text:string;data?:unknown}>{
 if(!isAuthorizedAiTool(session.ctx.membership.role,tool))throw Error("TOOL_DENIED");
 const ids=scopeFarmIds(args.farmId||null,session.farms.map(f=>f.id));
 if(!ids)throw Error("FARM_DENIED");
 const names=session.farms.filter(f=>ids.includes(f.id)).map(f=>f.name);
 if(tool==="listar_fincas")return{text:names.length?"Fincas autorizadas: "+names.join(", ")+".":"No hay fincas asignadas."};
 if(!ids.length)return{text:"No tienes fincas asignadas para esta consulta."};
 const where={tenantId:session.ctx.tenant.id,farmId:{in:ids}};
 if(tool==="resumen_ganado"){
  const [count,weight]=await Promise.all([prisma.animal.count({where}),prisma.animal.aggregate({where,_sum:{currentWeightKg:true},_avg:{currentWeightKg:true}})]);
  return{text:`Hay ${count} animales registrados en ${names.join(", ")}. Peso total registrado: ${Number(weight._sum.currentWeightKg||0).toLocaleString("es-VE")} kg; peso promedio de animales con peso registrado: ${Number(weight._avg.currentWeightKg||0).toFixed(1)} kg. Los animales sin peso no participan del promedio.`};
 }
 if(tool==="resumen_sanidad"){
  const [states,vaccines]=await Promise.all([
   prisma.animal.groupBy({by:["healthStatus"],where,_count:{_all:true}}),
   prisma.animalVaccinationRecord.count({where:{tenantId:session.ctx.tenant.id,animal:{farmId:{in:ids}},nextDueAt:{lt:new Date()}}}),
  ]);
  return{text:"Estados sanitarios en "+names.join(", ")+": "+(states.map(s=>textoEs(s.healthStatus,saludEs)+": "+s._count._all).join("; ")||"sin datos")+". Registros de vacunas con fecha próxima vencida: "+vaccines+". Un registro vencido no necesariamente equivale a un animal diferente."};
 }
 if(tool==="resumen_finanzas"){
  const grouped=await prisma.farmErpFinance.groupBy({by:["kind","currency"],where,_sum:{amountCents:true},_count:{_all:true}});
  return{text:"Movimientos registrados: "+(grouped.map(g=>(financeEs[g.kind]||"Movimiento")+" ("+g.currency+"): "+((g._sum.amountCents||0)/100).toLocaleString("es-VE")+"; registros: "+g._count._all).join("; ")||"ninguno")+". No representa ganancia neta ni saldo bancario. No se mezclan monedas."};
 }
 const min=args.minWeightKg;
 if(typeof min!=="number"||!Number.isFinite(min)||min<=0||min>2000)throw Error("INVALID_WEIGHT");
 const [count,total,animals]=await Promise.all([
  prisma.animal.count({where:{...where,currentWeightKg:{gte:min}}}),
  prisma.animal.aggregate({where:{...where,currentWeightKg:{gte:min}},_sum:{currentWeightKg:true}}),
  prisma.animal.findMany({where:{...where,currentWeightKg:{gte:min}},select:{internalCode:true,currentWeightKg:true,healthStatus:true,farm:{select:{name:true}}},take:12,orderBy:{currentWeightKg:"desc"}}),
 ]);
 return{text:`Preselección de venta (peso registrado al menos ${min} kg): ${count} animales, ${Number(total._sum.currentWeightKg||0).toLocaleString("es-VE")} kg en total. Primeros ${animals.length}: ${animals.map(a=>a.internalCode+" ("+Number(a.currentWeightKg)+" kg, "+textoEs(a.healthStatus,saludEs)+", "+a.farm.name+")").join("; ")||"ninguno"}. Esto no confirma disponibilidad comercial, restricciones sanitarias, peso vigente ni precio. No se ha reservado, vendido ni modificado ningún animal.`};
}
