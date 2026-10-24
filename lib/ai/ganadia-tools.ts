import { getCurrentTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { allowedFarmIds } from "@/lib/permissions/farm-access";
import { allowedAiTools, isAuthorizedAiTool, scopeFarmIds, type AiToolName } from "@/lib/ai/ganadia-policy";
import { financeEs, saludEs, textoEs } from "@/lib/i18n/labels";
import { analyzeAnimalWeight, type LivestockWeightResult } from "@/lib/ai/ganadia-weight-analysis";


const formatKg=(n:number)=>n.toLocaleString("es-VE",{maximumFractionDigits:1});
const formatGain=(n:number)=>n.toLocaleString("es-VE",{maximumFractionDigits:3});
const shortDate=(date:Date|string)=>new Date(date).toISOString().slice(0,10);

/** A complete authorized set, without truncating result counts or crossing farm scope. */
async function loadWeighingAnalysis(
  tenantId:string, farmIds:string[], referenceDate:Date, minKg:number,
):Promise<LivestockWeightResult[]> {
  const animals=await prisma.animal.findMany({
    where:{tenantId,farmId:{in:farmIds}},
    select:{
      id:true,internalCode:true,currentWeightKg:true,
      farm:{select:{name:true}},
      weightRecords:{
        where:{recordedAt:{lte:referenceDate}},
        select:{weightKg:true,recordedAt:true},
        orderBy:[{recordedAt:"desc"},{createdAt:"desc"}],
        take:10,
      },
    },
    orderBy:{id:"asc"},
    take:5001,
  });
  if(animals.length>5000)throw Error("AI_LIVESTOCK_ANALYSIS_NEEDS_PAGINATION");
  return animals.map(a=>analyzeAnimalWeight({
    code:a.internalCode,farmName:a.farm.name,
    fichaKg:a.currentWeightKg===null?null:Number(a.currentWeightKg),
    observations:a.weightRecords.map(w=>({kg:Number(w.weightKg),recordedAt:w.recordedAt})),
  },referenceDate,minKg));
}

function prepareAnalysisText(rows:LivestockWeightResult[],farmNames:string[],minKg:number,referenceDate:Date, includeSaleCandidates:boolean):string{
  const measured=rows.filter(a=>a.measuredAboveThreshold);
  const ficha=rows.filter(a=>a.fichaAboveThreshold);
  const projectedToday=rows.filter(a=>a.estimatedTodayCrossing);
  const projected30=rows.filter(a=>a.projected30DaysCrossing);
  const coverage=rows.filter(a=>a.latestKg!==null);
  const gain=rows.filter(a=>a.gainKgPerDay!==null && a.gainKgPerDay!>=-1 && a.gainKgPerDay!<=2.5);
  const measuredKg=measured.reduce((sum,a)=>sum+a.latestKg!,0);
  const farmDetail=farmNames.map(name=>{
    const f=rows.filter(a=>a.farmName===name);
    return name+": "+f.length+" animales; "+f.filter(a=>a.measuredAboveThreshold).length+
      " con último peso fechado >= "+formatKg(minKg)+" kg; "+
      f.filter(a=>a.fichaAboveThreshold).length+" con peso de ficha >= umbral; "+
      f.filter(a=>a.projected30DaysCrossing).length+" posibles adicionales por proyección a 30 días.";
  });
  const gainsByFarm=farmNames.map(name=>{
    const eligible=gain.filter(a=>a.farmName===name);
    const avg=eligible.length?eligible.reduce((sum,a)=>sum+a.gainKgPerDay!,0)/eligible.length:null;
    return name+": "+eligible.length+" animales con dos pesajes suficientes; "+
      (avg!==null?formatGain(avg)+" kg/día de variación media observada ("+formatKg(avg*30)+" kg por 30 días)":"sin serie suficiente.");
  });
  const sortedMeasured=[...measured].sort((a,b)=>b.latestKg!-a.latestKg!);
  const selected=sortedMeasured.slice(0,40);
  const details=selected.map(a=>
    a.code+" ("+a.farmName+"): "+formatKg(a.latestKg!)+" kg, pesado "+a.latestDate+
    (a.gainKgPerDay!==null?" (variación observada "+formatGain(a.gainKgPerDay)+" kg/día)":" (sin tasa histórica suficiente)"),
  );
  const projectedList=projected30.slice(0,15).map(a=>
    a.code+" ("+a.farmName+"): último pesaje "+formatKg(a.latestKg!)+" kg ("+a.latestDate+
    "), proyección en 30 días "+formatKg(a.estimatedIn30DaysKg!)+" kg; NO es peso medido.",
  );
  return [
    "DATOS DEMO del ERP según pesajes individuales y fichas; consulta realizada "+shortDate(referenceDate)+".",
    "Animales en fincas autorizadas: "+rows.length+"; con al menos un pesaje fechado: "+coverage.length+".",
    "Umbral: "+formatKg(minKg)+" kg. Según último peso medido fechado: "+measured.length+
      " animales (suma de esos pesos "+formatKg(measuredKg)+" kg).",
    "Según campo peso actual de la ficha (no es una nueva pesada fechada): "+ficha.length+" animales. "+
      "Estos dos indicadores NO se deben confundir.",
    "Proyección matemática con tasa observada y máximo 60 días desde la última pesada: "+
      projectedToday.length+" adicionales que podrían haber cruzado el umbral hoy; "+
      projected30.length+" adicionales que podrían cruzarlo dentro de 30 días. "+
      "Son estimaciones, no animales pesados ni confirmados para venta.",
    ...farmDetail,
    "Variación de peso: "+gainsByFarm.join(" "),
    ...(includeSaleCandidates?[
      "Animales con último pesaje verificado >= umbral, mostrando "+selected.length+" de "+measured.length+
      " (si hay más, consultar por finca): "+(details.join("; ")||"ninguno")+".",
      "Animales adicionales en proyección a 30 días (hasta 15): "+(projectedList.join("; ")||"ninguno")+".",
    ]:[]),
    "La GMD (ganancia media diaria) es la diferencia entre los dos pesajes utilizables dividida entre los días transcurridos. "+
      "No representa ganancia garantizada; alimento, salud y época pueden cambiar la tendencia.",
    "No efectuar venta ni declarar aptitud sanitaria: hace falta confirmación de peso vigente y evaluación ganadera.",
  ].join("\n");
}

async function listLatestWeighingJobs(tenantId:string,farmIds:string[],referenceDate:Date):Promise<string[]>{
  const jobs=await prisma.livestockOperation.findMany({
    where:{tenantId,farmId:{in:farmIds},status:"APPLIED",operationDate:{lte:referenceDate},plannedTypes:{has:"WEIGHING"}},
    select:{
      title:true,operationDate:true,
      farm:{select:{name:true}},
      animals:{where:{weightKg:{not:null}},select:{id:true}},
    },
    orderBy:{operationDate:"desc"},
    take:60,
  });
  const seen=new Set<string>();
  const lines:string[]=[];
  for(const work of jobs){
    const farm=work.farm.name;
    if(seen.has(farm))continue;
    seen.add(farm);
    lines.push(farm+": trabajo "+work.title+" del "+shortDate(work.operationDate)+
      ", con "+work.animals.length+" animales pesados registrados en la jornada.");
  }
  return lines;
}

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
  return{text:`Hay ${count} animales registrados en ${names.join(", ")}. Peso total del campo de ficha actual: ${Number(weight._sum.currentWeightKg||0).toLocaleString("es-VE")} kg; promedio del campo de ficha: ${Number(weight._avg.currentWeightKg||0).toFixed(1)} kg. Esto NO certifica la fecha del último pesaje por animal. Para histórico, trabajos de llano o aptitud por peso, consultar las herramientas de pesajes; los animales sin peso no participan del promedio.`};
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
 const referenceDate=new Date();
 const rows=await loadWeighingAnalysis(session.ctx.tenant.id,ids,referenceDate,min);
 const summary=prepareAnalysisText(rows,names,min,referenceDate,tool==="preseleccionar_venta");
 const recentWork=await listLatestWeighingJobs(session.ctx.tenant.id,ids,referenceDate);
 const jobs="Últimos trabajos de llano con pesaje aplicado: "+(recentWork.join(" ")||"ninguno registrado.");
 return {text:summary+"\n"+jobs};
}
