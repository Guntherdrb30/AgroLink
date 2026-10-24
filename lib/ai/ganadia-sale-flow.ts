import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { beginGanadiaChatTurn, appendGanadiaChatTurn } from "@/lib/ai/ganadia-memory";
import { ganadiaConversationScope } from "@/lib/ai/ganadia-memory-policy";
import { makeSaleDraft } from "@/server/services/livestock-sale-service";
import type { AiContext } from "@/lib/ai/ganadia-tools";

type Stage = "farm"|"threshold"|"quantity"|"buyer"|"price"|"review";
type State = {stage:Stage;farmId?:string;minKg?:number;quantity?:number;buyer?:string;price?:number;currency?:"USD"|"VES";ids?:string[];kg?:number;key:string};
const normalize=(s:string)=>s.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const start=/\b(guia|comprobante|documento|preparar venta|quiero vender|vender ganado|hazme la guia|sacar la guia)\b/;
const cancel=/^(cancelar|salir|detener|anular|olvidar la guia)$/;
const yes=/^(si|sí|confirmo|autorizo|crear|genera|generar|crear borrador|generar borrador)$/;
const num=(s:string)=>Number((s.match(/\d+(?:[.,]\d+)?/)||[])[0]?.replace(",",".")); 
function scope(ctx:AiContext){return ganadiaConversationScope({tenantId:ctx.ctx.tenant.id,userId:ctx.ctx.user.id,role:ctx.ctx.membership.role,authorizedFarmIds:ctx.farms.map(f=>f.id)})}
async function candidates(ctx:AiContext,st:State){
 const rows=await prisma.animal.findMany({where:{tenantId:ctx.ctx.tenant.id,farmId:st.farmId!,inventoryStatus:"ACTIVE"},select:{id:true,internalCode:true,currentWeightKg:true,weightRecords:{orderBy:[{recordedAt:"desc"},{createdAt:"desc"}],take:1,select:{weightKg:true,recordedAt:true}}},take:5001});
 if(rows.length>5000)throw Error("TOO_MANY_ANIMALS");
 return rows.map(a=>({id:a.id,code:a.internalCode,kg:Number(a.weightRecords[0]?.weightKg??a.currentWeightKg??0),measured:!!a.weightRecords[0]}))
 .filter(a=>a.measured&&a.kg>0&&a.kg>=(st.minKg||1))
 .sort((a,b)=>b.kg-a.kg||a.code.localeCompare(b.code));
}
function displayFarm(ctx:AiContext,st:State){return ctx.farms.find(f=>f.id===st.farmId)?.name||"Finca"}
export async function handleGanadiaSaleFlow(ctx:AiContext,message:string):Promise<null|{reply:string;saleDraft?:{id:string;url:string;count:number;kg:number};mode:"workflow"}>{
 const chat=await beginGanadiaChatTurn(ctx);
 const record=await prisma.ganadiaAiConversation.findUnique({where:{id:chat.id},select:{saleFlow:true}});
 let st=(record?.saleFlow&&typeof record.saleFlow==="object"&&!Array.isArray(record.saleFlow))?record.saleFlow as State:null;
 const normalized=normalize(message.trim()).replace(/[.!?]+$/,"");
 if(!st&&!start.test(normalized))return null;
 if(!["TENANT_OWNER","TENANT_ADMIN","FARM_MANAGER"].includes(ctx.ctx.membership.role)){
   return {reply:"Tu perfil puede consultar ganado, pero no preparar documentos de venta. Pide apoyo al responsable de la finca.",mode:"workflow"};
 }
 let reply="";let draft: {id:string;url:string;count:number;kg:number}|undefined;
 if(st&&cancel.test(normalized)){st=null;reply="Cancelé la preparación de la guía. No se descontó ningún animal."}
 else{
  if(!st)st={stage:"farm",key:crypto.randomUUID()};
  if(st.stage==="farm"){
   const chosen=ctx.farms.find(f=>normalized.includes(normalize(f.name))||message===f.id);
   if(chosen){st.farmId=chosen.id;st.stage="threshold";}
   else if(ctx.farms.length===1){st.farmId=ctx.farms[0].id;st.stage="threshold";}
   else{reply="Claro. Vamos a preparar tu guía interna. ¿De cuál finca quieres sacar ganado? "+ctx.farms.map(f=>f.name).join(" o ")+". Si necesitas ganado de ambas, hacemos una guía por finca.";}
   if(st.stage==="threshold")reply="Trabajaremos con "+displayFarm(ctx,st)+". ¿Cuál es el peso mínimo por animal: 450 kilos u otro? Usaré el último peso registrado, no una proyección.";
  }else if(st.stage==="threshold"){
   const kg=num(normalized);
   if(!Number.isFinite(kg)||kg<1||kg>2000)reply="Dime el peso mínimo por animal, por ejemplo: 450 kilos.";
   else{st.minKg=kg;const a=await candidates(ctx,st);if(!a.length){reply="No hay animales con último pesaje de "+kg+" kilos o más en "+displayFarm(ctx,st)+". Dime otro peso mínimo."; }
   else{st.stage="quantity";reply="En "+displayFarm(ctx,st)+" encontré "+a.length+" animales con último pesaje de "+kg+" kilos o más. ¿Cuántos quieres incluir en la guía? Puedes decir todos o una cantidad. Los elegiré de mayor a menor peso.";}}
  }else if(st.stage==="quantity"){
   const a=await candidates(ctx,st);
   const count=/\b(todos|todas)\b/.test(normalized)?a.length:Math.floor(num(normalized));
   if(!Number.isSafeInteger(count)||count<1||count>a.length){reply="Puedes seleccionar entre 1 y "+a.length+" animales. ¿Cuántos deseas incluir?";}
   else{const selected=a.slice(0,count);st.quantity=count;st.ids=selected.map(x=>x.id);st.kg=selected.reduce((s,x)=>s+x.kg,0);st.stage="buyer";reply="Seleccioné "+count+" animales de "+displayFarm(ctx,st)+" con "+st.kg.toLocaleString("es-VE")+" kilos medidos en total. ¿A nombre de quién preparo la guía? Puedes indicar 'por definir' si aún no tienes comprador."; }
  }else if(st.stage==="buyer"){
   if(message.trim().length<2||message.length>150)reply="Indica un nombre de comprador o escribe 'por definir'.";
   else{st.buyer=message.trim();st.stage="price";reply="¿Cuál es el precio por kilo en dólares? Por ejemplo, 2,50. Si todavía no está acordado, responde 0 y el comprobante quedará con precio pendiente de definir."; }
  }else if(st.stage==="price"){
   const price=num(normalized);
   if(!Number.isFinite(price)||price<0||price>100000)reply="Indica el precio por kilo, por ejemplo 2,50 dólares, o 0 si está pendiente.";
   else{st.price=Math.round(price*100);st.currency="USD";st.stage="review";reply="Revisa la guía interna:\nFinca: "+displayFarm(ctx,st)+"\nAnimales: "+st.quantity+"\nPeso total del último pesaje: "+st.kg!.toLocaleString("es-VE")+" kg\nPeso mínimo: "+st.minKg+" kg\nComprador: "+st.buyer+"\nPrecio: "+price.toLocaleString("es-VE")+" USD/kg\n\n¿Autorizas CREAR EL BORRADOR y su PDF? Responde 'sí, crear borrador' o 'cancelar'. Todavía no se vende ni descuenta ningún animal."; }
  }else if(st.stage==="review"){
   if(!yes.test(normalized)&&!/\b(si|sí)\b.*\b(crear|generar|borrador|guia)\b/.test(normalized))reply="Para guardar el borrador, responde 'sí, crear borrador'. O escribe 'cancelar'. No se descontará ganado.";
   else{
    const current=await candidates(ctx,st);
    const ids=st.ids||[];
    if(ids.length!==st.quantity||ids.some(id=>!current.some(a=>a.id===id))){st.stage="quantity";reply="Cambió el inventario o los pesajes. Debemos revisar nuevamente la cantidad antes de crear la guía.";}
    else{
     const result=await makeSaleDraft(ctx.ctx,{farmId:st.farmId!,animalIds:ids,buyerName:st.buyer!,pricePerKgCents:st.price!,currency:"USD",requestKey:st.key,saleDate:new Date().toISOString(),notes:"Borrador creado por GanadIA AI. Revisar datos, pesos y documentos antes de autorizar la venta."});
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
