"use client";
import { useState } from "react";
import { Bot, X, Send, LoaderCircle, ShieldCheck, Sparkles } from "lucide-react";
type Msg={by:"assistant"|"user";text:string};
type Farm={id:string;name:string};
export function GanadiaAssistant({financeOnly=false,veterinaryOnly=false}:{financeOnly?:boolean;veterinaryOnly?:boolean}){
 const [open,setOpen]=useState(false);
 const [messages,setMessages]=useState<Msg[]>([{by:"assistant",text:"¡Hola! Soy GanadIA AI. Puedo consultar información de las fincas a las que tienes acceso y ayudarte a interpretar sus registros."}]);
 const [message,setMessage]=useState("");
 const [farmId,setFarmId]=useState("");
 const [farms,setFarms]=useState<Farm[]>([]);
 const [busy,setBusy]=useState(false);
 const [mode,setMode]=useState<"asistido"|"generativo"|null>(null);
 const [weight,setWeight]=useState("450");
 const topics=veterinaryOnly?[["fincas","Mis fincas"],["sanidad","Sanidad"]]:financeOnly?[["fincas","Mis fincas"],["finanzas","Finanzas"]]:[["fincas","Mis fincas"],["ganado","Ganado"],["sanidad","Sanidad"],["finanzas","Finanzas"],["venta","Preparar venta"]];
 async function send(text:string,topic?:string){
  if(busy||!text.trim())return;
  const previous=message;setMessage("");setBusy(true);
  setMessages(a=>[...a.slice(-20),{by:"user",text}]);
  try{
   const response=await fetch("/api/ganadia-ai/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:text,topic,farmId:farmId||undefined,minWeightKg:Number(weight)}),cache:"no-store"});
   const data=await response.json();if(!response.ok)throw Error(data.error||"No se pudo consultar");
   if(Array.isArray(data.farms))setFarms(data.farms);
   if(data.mode==="asistido"||data.mode==="generativo")setMode(data.mode);
   setMessages(a=>[...a.slice(-20),{by:"assistant",text:data.reply}]);
  }catch(e){setMessage(previous);setMessages(a=>[...a.slice(-20),{by:"assistant",text:e instanceof Error?e.message:"Error de consulta"}]);}
  finally{setBusy(false)}
 }
 return <>
  <button type="button" onClick={()=>setOpen(true)} aria-label="Abrir GanadIA AI" title="Hablar con GanadIA AI" className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-4 z-40 flex size-14 items-center justify-center rounded-full bg-[#234a34] text-white shadow-xl ring-2 ring-[#d0ba80] lg:bottom-7 lg:right-7"><Bot className="size-7"/></button>
  {open&&<div className="fixed inset-0 z-[60] flex items-end justify-end bg-[#14271c]/55 lg:p-5">
   <section role="dialog" aria-modal="true" aria-label="GanadIA AI" className="flex h-[94dvh] w-full flex-col overflow-hidden rounded-t-[24px] bg-white shadow-2xl lg:h-[min(750px,92dvh)] lg:max-w-[480px] lg:rounded-3xl">
    <header className="flex items-center justify-between bg-[#234a34] px-5 py-4 text-white"><div className="flex items-center gap-3"><Sparkles className="size-6 text-[#e9d49c]"/><div><h2 className="text-lg font-bold">GanadIA AI</h2><p className="text-xs text-white/80">Tu asistente de gestión ganadera</p></div></div><button type="button" className="rounded-full p-2 hover:bg-white/15" onClick={()=>setOpen(false)} aria-label="Cerrar asistente"><X/></button></header>
    <div className="flex items-center gap-2 border-b bg-[#f4f6f1] px-4 py-2 text-xs text-[#415b45]"><ShieldCheck className="size-4 shrink-0"/>{mode==="generativo"?"OpenAI activo · consultas por rol y finca":"Consultas seguras por rol y finca · acceso según permisos"}</div>
    <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5" aria-live="polite">
      {messages.map((m,i)=><p key={i} className={"max-w-[92%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 "+(m.by==="user"?"ml-auto bg-[#e5efdf] text-[#183324]":"bg-[#f1f3ef] text-[#243a29]")}>{m.text}</p>)}
      {busy&&<p className="flex items-center gap-2 text-sm text-[#607361]"><LoaderCircle className="size-4 animate-spin"/>Consultando tus registros...</p>}
    </div>
    <div className="space-y-3 border-t bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
     {farms.length>0&&<label className="block text-xs font-medium text-[#385344]">Finca<select value={farmId} onChange={e=>setFarmId(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border px-3"><option value="">Todas mis fincas autorizadas</option>{farms.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label>}
     {!financeOnly&&!veterinaryOnly&&<label className="flex items-center gap-2 text-xs font-medium text-[#385344]">Peso mínimo para venta (kg)<input aria-label="Peso mínimo para preselección" className="h-9 w-20 rounded-lg border px-2" min="1" max="2000" type="number" value={weight} onChange={e=>setWeight(e.target.value)}/></label>}
     <div className="flex gap-2 overflow-x-auto pb-1">{topics.map(([id,label])=><button key={id} type="button" disabled={busy} onClick={()=>void send(label==="Preparar venta"?"Preseleccionar animales de más de "+weight+" kg":label,id)} className="min-h-10 shrink-0 rounded-full border border-[#c5d3c6] px-3 text-xs font-semibold text-[#21442a] disabled:opacity-50">{label}</button>)}</div>
     <form onSubmit={e=>{e.preventDefault();void send(message)}} className="flex items-end gap-2">
       <textarea rows={2} maxLength={700} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Escribe tu consulta sobre la finca..." aria-label="Mensaje para GanadIA AI" className="min-h-12 flex-1 resize-none rounded-xl border border-[#c9d6c9] p-3 text-sm outline-none focus:border-[#234a34]"/>
       <button type="submit" disabled={busy||!message.trim()} aria-label="Enviar mensaje" className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#234a34] text-white disabled:opacity-40"><Send className="size-5"/></button>
     </form>
     <p className="text-center text-[11px] text-[#657869]">Consultas de solo lectura. El modo generativo puede consumir presupuesto piloto de OpenAI; nunca ejecuta ventas ni movimientos.</p>
    </div>
   </section>
  </div>}
 </>;
}
