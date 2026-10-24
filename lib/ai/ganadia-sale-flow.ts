import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { beginGanadiaChatTurn, appendGanadiaChatTurn } from "@/lib/ai/ganadia-memory";
import { ganadiaConversationScope } from "@/lib/ai/ganadia-memory-policy";
import { makeSaleDraft } from "@/server/services/livestock-sale-service";
import type { AiContext } from "@/lib/ai/ganadia-tools";
import { extractTargetKilograms, wantsFarmComparison, acceptsRecommendedFarm, compareAuthorizedFarmCapacity } from "@/lib/ai/ganadia-farm-capacity";
import { numberFromText, parseSaleSelection, selectSaleAnimals } from "@/lib/ai/ganadia-sale-selection";

type Stage = "farm"|"threshold"|"quantity"|"buyer"|"price"|"review";
type State = {stage:Stage;farmId?:string;minKg?:number;quantity?:number;buyer?:string;price?:number;currency?:"USD"|"VES";ids?:string[];kg?:number;targetKg?:number;differenceKg?:number;suggestedFarmId?:string;key:string};
const normalize=(s:string)=>s.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const start=/\b(guia|comprobante|documento|preparar venta|quiero vender|vender ganado|hazme la guia|sacar la guia)\b/;
const cancel=/^(cancelar|salir|detener|anular|olvidar la guia)$/;
const yes=/^(si|sí|confirmo|autorizo|crear|genera|generar|crear borrador|generar borrador)$/;
const num=(s:string)=>numberFromText(s); 
function scope(ctx:AiContext){return ganadiaConversationScope({tenantId:ctx.ctx.tenant.id,userId:ctx.ctx.user.id,role:ctx.ctx.membership.role,authorizedFarmIds:ctx.farms.map(f=>f.id)})}
async function candidates(ctx:AiContext,st:State){
 const rows=await prisma.animal.findMany({where:{tenantId:ctx.ctx.tenant.id,farmId:st.farmId!,inventoryStatus:"ACTIVE"},select:{id:true,internalCode:true,currentWeightKg:true,weightRecords:{where:{recordedAt:{lte:new Date()}},orderBy:[{recordedAt:"desc"},{createdAt:"desc"}],take:1,select:{weightKg:true,recordedAt:true}}},take:5001});
 if(rows.length>5000)throw Error("TOO_MANY_ANIMALS");
 return rows.map(a=>({id:a.id,code:a.internalCode,kg:Number(a.weightRecords[0]?.weightKg??a.currentWeightKg??0),measured:!!a.weightRecords[0]}))
 .filter(a=>a.measured&&a.kg>0&&a.kg>=(st.minKg||1))
 .sort((a,b)=>b.kg-a.kg||a.code.localeCompare(b.code));
}
function displayFarm(ctx:AiContext,st:State){return ctx.farms.find(f=>f.id===st.farmId)?.name||"Finca"}
export async function handleGanadiaSaleFlow(ctx:AiContext,message:string,defaultMinKg=450):Promise<null|{reply:string;saleDraft?:{id:string;url:string;count:number;kg:number};mode:"workflow"}>{
 const chat=await beginGanadiaChatTurn(ctx);
 const record=await prisma.ganadiaAiConversation.findUnique({where:{id:chat.id},select:{saleFlow:true}});
 let st=(record?.saleFlow&&typeof record.saleFlow==="object"&&!Array.isArray(record.saleFlow))?record.saleFlow as State:null;
 const normalized=normalize(message.trim()).replace(/[.!?]+$/,"");
 if(!st&&!start.test(normalized) && !(wantsFarmComparison(normalized)&&extractTargetKilograms(message,chat.history)!==null&&/\b(finca|fincas|ganado|guia|venta)\b/.test(normalized)))return null;
 if(!["TENANT_OWNER","TENANT_ADMIN","FARM_MANAGER"].includes(ctx.ctx.membership.role)){
   return {reply:"Tu perfil puede consultar ganado, pero no preparar documentos de venta. Pide apoyo al responsable de la finca.",mode:"workflow"};
 }
 let reply="";let draft: {id:string;url:string;count:number;kg:number}|undefined;
 if(st&&cancel.test(normalized)){st=null;reply="Cancelé la preparación de la guía. No se descontó ningún animal."}
 else{
  if(!st)st={stage:"farm",key:crypto.randomUUID()};
  if(st.stage==="farm"){
   // Recover goals from previous user turns in an existing saved conversation,
   // e.g. "8.000 kilos" followed by "revisa cuál finca los tiene".
   const rememberedGoal=extractTargetKilograms(message,chat.history);
   if(rememberedGoal!==null)st.targetKg=rememberedGoal;
   const namesInMessage=ctx.farms.filter(f=>normalized.includes(normalize(f.name))||message===f.id);
   const comparisonRequested=wantsFarmComparison(normalized) ||
     (st.targetKg!==undefined && namesInMessage.length===0 && !acceptsRecommendedFarm(message));
   const selectedFarm=namesInMessage.length===1 && !comparisonRequested
     ? namesInMessage[0]
     : namesInMessage.length===1 && !wantsFarmComparison(normalized)
       ? namesInMessage[0]
       : st.suggestedFarmId && acceptsRecommendedFarm(message)
         ? ctx.farms.find(f=>f.id===st?.suggestedFarmId)
         : ctx.farms.length===1 && !comparisonRequested
           ? ctx.farms[0]
           : undefined;
   if(selectedFarm){
    st.farmId=selectedFarm.id;
    st.suggestedFarmId=undefined;
    if(st.targetKg!==undefined){
     if(st.minKg===undefined)st.minKg=defaultMinKg;
     const eligible=await candidates(ctx,st);
     const proposal=selectSaleAnimals(eligible,{kind:"targetKg",targetKg:st.targetKg});
     if(!proposal.targetReachable){
      st.farmId=undefined;
      reply="Con mínimo "+st.minKg+" kg, "+selectedFarm.name+" tiene "+proposal.maxAvailableKg.toLocaleString("es-VE")+" kg disponibles para una guía. No llega a tu objetivo de "+st.targetKg.toLocaleString("es-VE")+" kg. ¿Quieres que revise las otras fincas o prefieres cambiar el objetivo?";
     }else{
      st.quantity=proposal.count;st.ids=proposal.animals.map(a=>a.id);st.kg=proposal.totalKg;
      st.differenceKg=proposal.differenceKg??undefined;
      st.stage="buyer";
      reply="Perfecto. Para "+selectedFarm.name+" seleccioné "+proposal.count+" animales de al menos "+st.minKg+" kg, sumando "+proposal.totalKg.toLocaleString("es-VE")+" kg según sus últimos pesajes. Objetivo: "+st.targetKg.toLocaleString("es-VE")+" kg; diferencia: "+(proposal.differenceKg!>=0?"+":"")+proposal.differenceKg!.toLocaleString("es-VE")+" kg.\n¿A nombre de quién preparo la guía? Aún no se ha vendido ni descontado ganado.";
     }
    }else{
     st.stage="threshold";
     reply="Trabajaremos con "+selectedFarm.name+". ¿Cuál es el peso mínimo por animal: 450 kilos u otro? Usaré el último peso registrado, no una proyección.";
    }
   }else if(st.targetKg!==undefined && ctx.farms.length>0 &&
     (comparisonRequested || (st.suggestedFarmId && !selectedFarm))){
    const minimum=Number.isFinite(defaultMinKg)&&defaultMinKg>=1&&defaultMinKg<=2000
      ?defaultMinKg:450;
    if(st.minKg===undefined)st.minKg=minimum;
    const pools=await Promise.all(ctx.farms.map(async farm=>{
      const herd=await candidates(ctx,{...(st as State),farmId:farm.id});
      return {id:farm.id,name:farm.name,animals:herd};
    }));
    const result=compareAuthorizedFarmCapacity(pools,st.targetKg);
    st.suggestedFarmId=result.recommendedId??undefined;
    const format=(n:number)=>n.toLocaleString("es-VE",{maximumFractionDigits:2});
    const lines=result.farms.map(f=>f.name+": "+f.count+" animales de al menos "+st.minKg+
      " kg, "+format(f.availableKg)+" kg disponibles."+
      (f.canMeetTarget?" Sí alcanza.":" No alcanza."));
    if(result.recommendedId){
      const best=result.farms.find(f=>f.id===result.recommendedId)!;
      const difference=best.proposal.differenceKg??0;
      reply="Revisé tus fincas para una guía interna de "+format(st.targetKg)+" kg, usando un mínimo de "+st.minKg+" kg por animal según el último pesaje.\n"+
        lines.join("\n")+
        "\n\nTe recomiendo "+best.name+". Puedo preseleccionar "+best.proposal.count+
        " animales que suman "+format(best.proposal.totalKg)+" kg"+
        " (diferencia "+(difference>=0?"+":"")+format(difference)+" kg). "+
        "¿Seguimos con "+best.name+"? Responde 'sí' o elige otra finca. Si quieres cambiar el peso mínimo, dímelo.";
    }else{
      reply="Revisé tus fincas para "+format(st.targetKg)+" kg, con mínimo "+st.minKg+
        " kg por animal.\n"+lines.join("\n")+
        "\nNinguna finca alcanza ese total por separado. Podemos bajar el objetivo o el peso mínimo; no mezclaré animales de distintas fincas en una sola guía.";
    }
   }else{
    reply="Claro. Vamos a preparar tu guía interna. ¿De cuál finca quieres sacar ganado? "+
      ctx.farms.map(f=>f.name).join(" o ")+
      ". Si quieres, también puedo revisar cuál finca tiene suficiente ganado para los kilos que necesitas.";
   }
  }else if(st.stage==="threshold"){
   const kg=num(normalized);
   if(kg===null||!Number.isFinite(kg)||kg<1||kg>2000)reply="Dime el peso mínimo por animal, por ejemplo: 450 kilos.";
   else{st.minKg=kg;const a=await candidates(ctx,st);if(!a.length){reply="No hay animales con último pesaje de "+kg+" kilos o más en "+displayFarm(ctx,st)+". Dime otro peso mínimo."; }
   else{st.stage="quantity";reply="En "+displayFarm(ctx,st)+" encontré "+a.length+" animales con último pesaje de "+kg+" kilos o más. ¿Cuántos animales o cuántos kilos totales quieres incluir en la guía? Por ejemplo: 15 animales, todos o aproximadamente 8.000 kilos.";}}
  }else if(st.stage==="quantity"){
   const a=await candidates(ctx,st);
   const selectionRequest=parseSaleSelection(normalized);
   if(!selectionRequest)reply="Dime cuántos animales o cuántos kilos necesitas en total. Por ejemplo: 12 animales, todos o 8.000 kilos.";
   else{
    let selection;
    try{selection=selectSaleAnimals(a,selectionRequest);}
    catch{reply="Elige entre 1 y 100 animales, o indica los kilos totales que quieres alcanzar.";}
    if(selection){
     if(!selection.targetReachable){
      reply="El peso solicitado de "+selection.targetKg!.toLocaleString("es-VE")+" kg supera los "+selection.maxAvailableKg.toLocaleString("es-VE")+" kg que puedo preparar con los animales disponibles de esta finca (hasta 100 por guía). Prueba con menos kilos, otro peso mínimo o una cantidad.";
     }else{
      st.quantity=selection.count;st.ids=selection.animals.map(x=>x.id);st.kg=selection.totalKg;st.targetKg=selection.targetKg??undefined;st.differenceKg=selection.differenceKg??undefined;
      st.stage="buyer";
      reply="Seleccioné "+selection.count+" animales de "+displayFarm(ctx,st)+" con "+selection.totalKg.toLocaleString("es-VE")+" kg de últimos pesajes."+(selection.targetKg===null?"":"\nObjetivo: "+selection.targetKg.toLocaleString("es-VE")+" kg. Diferencia: "+(selection.differenceKg!>=0?"+":"")+selection.differenceKg!.toLocaleString("es-VE")+" kg.")+"\nEl peso de venta definitivo debe verificarse. ¿A nombre de quién preparo la guía? Puedes indicar 'por definir'.";
     }
    }
   }
  }else if(st.stage==="buyer"){
   if(message.trim().length<2||message.length>150)reply="Indica un nombre de comprador o escribe 'por definir'.";
   else{st.buyer=message.trim();st.stage="price";reply="¿Cuál es el precio por kilo en dólares? Por ejemplo, 2,50. Si todavía no está acordado, responde 0 y el comprobante quedará con precio pendiente de definir."; }
  }else if(st.stage==="price"){
   const price=num(normalized);
   if(price===null||!Number.isFinite(price)||price<0||price>100000)reply="Indica el precio por kilo, por ejemplo 2,50 dólares, o 0 si está pendiente.";
   else{st.price=Math.round(price*100);st.currency="USD";st.stage="review";reply="Revisa la guía interna:\nFinca: "+displayFarm(ctx,st)+"\nAnimales: "+st.quantity+"\nPeso total del último pesaje: "+st.kg!.toLocaleString("es-VE")+" kg\nPeso mínimo: "+st.minKg+" kg\nComprador: "+st.buyer+"\nPrecio: "+price.toLocaleString("es-VE")+" USD/kg"+(st.targetKg?"\nObjetivo: "+st.targetKg.toLocaleString("es-VE")+" kg; diferencia: "+(st.differenceKg!>=0?"+":"")+st.differenceKg!.toLocaleString("es-VE")+" kg":"")+"\n\n¿Autorizas CREAR EL BORRADOR y su PDF? Responde 'sí, crear borrador' o 'cancelar'. Todavía no se vende ni descuenta ningún animal."; }
  }else if(st.stage==="review"){
   if(!yes.test(normalized)&&!/\b(si|sí)\b.*\b(crear|generar|borrador|guia)\b/.test(normalized))reply="Para guardar el borrador, responde 'sí, crear borrador'. O escribe 'cancelar'. No se descontará ganado.";
   else{
    const current=await candidates(ctx,st);
    const ids=st.ids||[];
    if(ids.length!==st.quantity||ids.some(id=>!current.some(a=>a.id===id))){st.stage="quantity";reply="Cambió el inventario o los pesajes. Debemos revisar nuevamente la cantidad antes de crear la guía.";}
    else{
     const result=await makeSaleDraft(ctx.ctx,{farmId:st.farmId!,animalIds:ids,buyerName:st.buyer!,pricePerKgCents:st.price!,currency:"USD",requestKey:st.key,saleDate:new Date().toISOString(),notes:"Borrador creado por GanadIA AI. "+(st.targetKg?"Objetivo: "+st.targetKg+" kg. Diferencia: "+st.differenceKg+" kg. ":"")+"Revisar datos, pesos y documentos antes de autorizar la venta."});
     draft={id:result.id,url:"/api/livestock-sales/"+encodeURIComponent(result.id)+"/receipt",count:ids.length,kg:st.kg!};
     reply="Listo. Creé tu comprobante INTERNO de venta en BORRADOR para "+ids.length+" animales de "+displayFarm(ctx,st)+". Puedes descargarlo aquí, revisarlo y autorizar la venta posteriormente. No se descontó ganado. No es un permiso INSAI.";
     st=null;
    }
   }
  }
 }
 const updated=await prisma.ganadiaAiConversation.updateMany({where:{id:chat.id,tenantId:ctx.ctx.tenant.id,userId:ctx.ctx.user.id,accessHash:scope(ctx),generation:chat.generation},data:{saleFlow:st?st as unknown as Prisma.InputJsonValue:Prisma.DbNull}});
 if(updated.count!==1)throw Error("CHAT_CLEARED_DURING_REQUEST");
 await appendGanadiaChatTurn(ctx,chat,message,reply);
 return {reply,mode:"workflow",...(draft?{saleDraft:draft}:{})};
}
