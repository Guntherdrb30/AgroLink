"use client";
import { useState } from "react";
import { Bot, X, Send, LoaderCircle } from "lucide-react";
type ChatMessage = { from: "user" | "assistant"; message: string };
type Farm = { id: string; name: string };
export function GanadiaAssistant({ financeOnly = false, veterinaryOnly = false }: { financeOnly?: boolean; veterinaryOnly?: boolean }) {
 const [open, setOpen] = useState(false);
 const [topic,setTopic] = useState("fincas");
 const [farmId,setFarmId] = useState("");
 const [weight,setWeight] = useState("450");
 const [busy,setBusy] = useState(false);
 const [messages,setMessages] = useState<ChatMessage[]>([]);
 const [farms,setFarms] = useState<Farm[]>([]);
 async function ask(t: string) {
  setBusy(true);
  setMessages(old=>[...old,{from:"user",message:t==="venta"?"Preparar venta por peso mínimo de "+weight+" kg":({fincas:"Mis fincas",ganado:"Inventario de ganado",sanidad:"Resumen de sanidad",finanzas:"Resumen financiero",ayuda:"¿Qué puedes hacer?"}[t]||t)}]);
  try{
   const result=await fetch("/api/ganadia-ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({topic:t,farmId:farmId||undefined,minWeightKg:Number(weight)}),cache:"no-store"});
   const data=await result.json();
   if(!result.ok)throw Error(data.error||"No se pudo consultar");
   if(Array.isArray(data.farms))setFarms(data.farms);
   let message="";
   if(data.kind==="farms")message="Fincas autorizadas: "+(data.farms.map((f:Farm)=>f.name).join(", ")||"ninguna asignada");
   else if(data.kind==="livestock")message="Ganado registrado en el alcance autorizado: "+data.total+" animal(es).";
   else if(data.kind==="health")message="Estados sanitarios: "+data.grouped.map((r:{healthStatus:string;_count:{_all:number}})=>r.healthStatus+": "+r._count._all).join("; ")+".";
   else if(data.kind==="sale_preparation")message="Preselección: "+data.count+" animales con peso >= "+data.minWeightKg+" kg. Peso total registrado: "+data.totalWeightKg.toLocaleString("es-VE")+" kg. No se ha reservado ni vendido ningún animal. No se aplica precio sin referencia validada.";
   else if(data.kind==="finance")message="Movimientos registrados: "+(data.records.map((r:{currency:string;kind:string;_sum:{amountCents:number|null}})=>r.kind+" ("+r.currency+"): "+((r._sum.amountCents||0)/100).toLocaleString("es-VE")).join("; ")||"sin movimientos")+". Datos por moneda; no equivalen a utilidad contable.";
   else message=data.note||"Consulta completada.";
   setMessages(old=>[...old,{from:"assistant",message}]);
  }catch(e){setMessages(old=>[...old,{from:"assistant",message:e instanceof Error?e.message:"Error de consulta"}]);}
  finally{setBusy(false)}
 }
 const topics=veterinaryOnly?[["fincas","Mis fincas"],["sanidad","Sanidad"],["ayuda","Ayuda"]]:financeOnly?[["finanzas","Finanzas"],["ayuda","Ayuda"]]:[["fincas","Mis fincas"],["ganado","Ganado"],["sanidad","Sanidad"],["venta","Preparar venta"],["finanzas","Finanzas"],["ayuda","Ayuda"]];
 return <>
  <button type="button" onClick={()=>setOpen(true)} aria-label="Abrir GanadIA AI" className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-4 z-40 flex size-14 items-center justify-center rounded-full bg-[#234a34] text-white shadow-xl ring-2 ring-[#d0ba80] lg:bottom-7 lg:right-7"><Bot className="size-7"/></button>
  {open&&<div className="fixed inset-0 z-[60] flex items-end justify-end bg-[#14271c]/50 lg:p-5">
   <section role="dialog" aria-modal="true" aria-label="GanadIA AI" className="flex h-[90dvh] w-full flex-col overflow-hidden rounded-t-[24px] bg-white shadow-2xl lg:h-[min(750px,90dvh)] lg:max-w-[450px] lg:rounded-3xl">
    <header className="flex items-center justify-between bg-[#234a34] px-5 py-4 text-white"><div><h2 className="text-xl font-bold">GanadIA AI</h2><p className="text-xs text-white/75">Consultas reales y control de permisos · modo asistido</p></div><button type="button" aria-label="Cerrar asistente" onClick={()=>setOpen(false)} className="rounded-full p-2 hover:bg-white/10"><X/></button></header>
    <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
     <p className="rounded-xl bg-[#f1f5ec] p-3 text-sm">Consulta datos reales de las fincas a las que tengas acceso. La IA generativa y las acciones de escritura aún no están habilitadas.</p>
     {messages.map((m,i)=><p key={i} className={"max-w-[90%] whitespace-pre-wrap rounded-xl p-3 text-sm "+(m.from==="user"?"ml-auto bg-[#e7eedf]":"bg-[#f1f2f0]")}>{m.message}</p>)}
     {busy&&<p className="flex items-center gap-2 text-sm"><LoaderCircle className="size-4 animate-spin"/>Consultando...</p>}
    </div>
    <footer className="space-y-3 border-t bg-white p-4">
     {farms.length>0&&<label className="block text-xs font-medium">Finca <select value={farmId} onChange={e=>setFarmId(e.target.value)} className="mt-1 h-11 w-full rounded-lg border px-3"><option value="">Todas mis fincas autorizadas</option>{farms.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label>}
     {!financeOnly&&!veterinaryOnly&&<label className="block text-xs font-medium">Peso mínimo para venta (kg)<input type="number" value={weight} onChange={e=>setWeight(e.target.value)} min="1" max="2000" className="mt-1 h-11 w-full rounded-lg border px-3"/></label>}
     <div className="grid grid-cols-2 gap-2">{topics.map(([id,label])=><button key={id} type="button" disabled={busy} onClick={()=>{setTopic(id);void ask(id)}} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border px-2 text-sm font-semibold text-[#284432] disabled:opacity-50"><Send className="size-3"/>{label}</button>)}</div>
     <p className="text-[11px] text-[#6b786c]">Acciones disponibles de solo lectura. Los reportes no sustituyen documentos oficiales ni asesoría profesional.</p>
    </footer>
   </section>
  </div>}
 </>;
}
