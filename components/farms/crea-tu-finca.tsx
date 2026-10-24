"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {ArrowLeft,ArrowRight,CheckCircle2,Leaf,RotateCcw,Sparkles,Send} from "lucide-react";
type State={status:string;step:string;version:number;answers:Record<string,unknown>;history:Array<{question:string;answer:string}>;proposal:{purpose:string;modules:string[];recommendations:string[];futureModules:string[];warnings:string[]}|null;farmId:string|null;question:string};
const api="/api/farms/crear-con-ganadia";
const fields=[["vision","Visión"],["name","Nombre"],["location","Ubicación"],["hectares","Hectáreas"],["purpose","Propósito"],["herd","Ganado"],["land","Terreno"],["goals","Objetivos"]];
const examples:Record<string,string>={vision:"Tengo una finca de doble propósito, crío vacas y quiero controlar gastos, partos y pesos.",name:"Finca La Esperanza",location:"Barinas, Venezuela",hectares:"200",purpose:"Doble propósito",herd:"50 vacas, 10 novillas y 4 toros",land:"Potreros, pozo de agua y corral",goals:"Llevar controles de sanidad, reproducción y ventas"};
export function CreaTuFinca({name}:{name:string}){
 const [s,setS]=useState<State|null>(null),[text,setText]=useState(""),[busy,setBusy]=useState(false),[err,setErr]=useState(""),[edit,setEdit]=useState<string|null>(null);
 useEffect(()=>{let active=true;fetch(api,{cache:"no-store"}).then(r=>r.json()).then(d=>{if(active)setS(d)}).catch(()=>{if(active)setErr("No se pudo recuperar tu borrador.")});return()=>{active=false}},[]);
 async function analyzeWithOpenAI(){
  if(!s||busy||s.status!=="REVIEW")return;
  if(!window.confirm("¿Analizar esta propuesta con OpenAI? Utiliza la cuota piloto existente y no crea ni modifica animales."))return;
  setBusy(true);setErr("");
  try{
   const r=await fetch(api+"/analizar",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({version:s.version})});
   const d=await r.json();if(!r.ok)throw Error(d.error||"No se pudo realizar el análisis.");
   setS(prev=>prev?{...prev,proposal:d.proposal,version:d.version??prev.version}:prev);
  }catch(e){setErr(e instanceof Error?e.message:"No se pudo analizar");}
  finally{setBusy(false)}
 }
 async function send(action:"answer"|"revise"|"reset"|"approve",field?:string){
  if(!s||busy)return;
  if((action==="answer"||action==="revise")&&!text.trim())return;
  if(action==="reset"&&!window.confirm("¿Reiniciar el borrador guiado? Esto no elimina ninguna finca."))return;
  if(action==="approve"&&!window.confirm("¿Apruebas crear esta finca con la configuración propuesta? No se cargarán animales ni activos ficticios."))return;
  setBusy(true);setErr("");
  try{
   const r=await fetch(api,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,version:s.version,...(action==="answer"||action==="revise"?{text,...(field?{field}:{})}:{}),...(action==="approve"?{confirm:true}:{})})});
   const d=await r.json();if(!r.ok)throw Error(d.error||"No se pudo guardar.");
   setS(d);setText("");setEdit(null);
  }catch(e){setErr(e instanceof Error?e.message:"Error al guardar");}
  finally{setBusy(false);}
 }
 if(!s)return <div className="rounded-3xl bg-white p-8">{err||"Preparando tu asistente..."}</div>;
 const progress=s.status==="COLLECTING"?Math.round(fields.findIndex(([key])=>key===s.step)/fields.length*100):100;
 return <div className="mx-auto max-w-5xl space-y-5 pb-24">
  <Link href="/farms" className="inline-flex items-center gap-2 text-sm font-semibold text-[#735b33]"><ArrowLeft className="size-4"/>Volver a mis fincas</Link>
  <header className="rounded-[28px] bg-[linear-gradient(120deg,#183625,#31593a)] p-6 text-white sm:p-9">
   <div className="flex items-center gap-3"><Leaf className="size-8 text-[#e4c889]"/><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#e4c889]">GanadIA · Configuración inteligente</p><h1 className="text-3xl font-bold">Crea tu Finca</h1></div></div>
   <p className="mt-3 max-w-2xl text-sm leading-7 text-white/85">Hola, {name}. Cuéntame cómo trabajas y organizaremos tu finca paso a paso. Antes de crearla, revisarás y aprobarás la propuesta.</p>
   <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#ddc58b] transition-all" style={{width:progress+"%"}}/></div>
  </header>
  {err&&<div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{err}</div>}
  {s.status==="APPLIED"?<section className="space-y-4 rounded-3xl border bg-white p-7"><CheckCircle2 className="size-11 text-green-700"/><h2 className="text-2xl font-bold">¡Tu finca está creada!</h2><p className="text-sm text-[#526b54]">El perfil productivo quedó aprobado y guardado. No se crearon animales ni movimientos ficticios.</p><Link href={"/farms/"+s.farmId} className="inline-flex min-h-11 items-center rounded-xl bg-[#235035] px-5 font-semibold text-white">Administrar mi finca <ArrowRight className="ml-2 size-4"/></Link><button disabled={busy} onClick={()=>void send("reset")} className="ml-3 inline-flex min-h-11 items-center rounded-xl border px-4 text-sm font-semibold text-[#245136]">Crear otra finca</button></section>:s.status==="REVIEW"&&s.proposal?
  <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
   <section className="space-y-3 rounded-3xl border bg-white p-5 sm:p-7"><h2 className="text-xl font-bold">Datos declarados</h2>{fields.map(([key,label])=><div key={key} className="rounded-xl border-b py-2"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase text-[#748174]">{label}</span><button className="text-xs font-semibold text-[#765e32] underline" onClick={()=>{setEdit(key);setText(key==="hectares"?(s.answers[key]===null?"No sé":String(s.answers[key]??"")):String(s.answers[key]??""))}}>Corregir</button></div><p className="mt-1 text-sm">{s.answers[key]===null?"Por confirmar":String(s.answers[key]??"Pendiente")}</p></div>)}
   {edit&&<div className="rounded-xl bg-[#f6f7f2] p-3"><p className="text-sm font-semibold">Editar {fields.find(x=>x[0]===edit)?.[1]}</p><textarea rows={3} className="mt-2 w-full rounded-lg border bg-white p-3 text-sm" value={text} onChange={e=>setText(e.target.value)}/><button disabled={busy} onClick={()=>void send("revise",edit)} className="mt-2 rounded-lg bg-[#28533a] px-4 py-2 text-sm font-semibold text-white">Guardar corrección</button></div>}</section>
   <section className="space-y-4 rounded-3xl border bg-white p-5 sm:p-7"><div className="flex items-center gap-2"><Sparkles className="size-6 text-[#8c6b36]"/><h2 className="text-xl font-bold">Propuesta de configuración</h2></div><p className="rounded-xl bg-[#ecf3e9] p-3 text-sm font-semibold text-[#264832]">Perfil: {s.proposal.purpose.replaceAll("_"," ")}</p><h3 className="font-semibold">Módulos disponibles</h3><div className="grid grid-cols-2 gap-2">{s.proposal.modules.map(m=><p key={m} className="rounded-xl bg-[#f5f8f4] p-3 text-xs font-semibold"><CheckCircle2 className="mr-1 inline size-4 text-green-700"/>{m}</p>)}</div><h3 className="font-semibold">Recomendaciones</h3>{s.proposal.recommendations.map(x=><p key={x} className="text-sm leading-6">{x}</p>)}{s.proposal.futureModules.length>0&&<><h3 className="font-semibold">Próximas capacidades</h3>{s.proposal.futureModules.map(x=><p key={x} className="text-sm text-[#6b765e]">{x}</p>)}</>}{s.proposal.warnings.map(x=><p key={x} className="text-xs text-[#826335]">{x}</p>)}<button disabled={busy} onClick={()=>void analyzeWithOpenAI()} className="min-h-11 w-full rounded-xl border border-[#98b19a] px-4 text-sm font-semibold text-[#285538] disabled:opacity-40"><Sparkles className="mr-2 inline size-4"/>Analizar propuesta con OpenAI</button><p className="text-xs text-[#6c7d6b]">Opcional; utiliza únicamente el presupuesto piloto aprobado.</p><button disabled={busy} onClick={()=>void send("approve")} className="min-h-12 w-full rounded-xl bg-[#245136] px-4 font-bold text-white disabled:opacity-50">Aprobar y crear mi finca</button><button disabled={busy} onClick={()=>void send("reset")} className="w-full py-2 text-xs text-[#8e6a35]">Comenzar nuevamente</button></section>
  </div>:
  <section className="mx-auto max-w-3xl rounded-3xl border bg-white p-5 shadow-sm sm:p-8"><div className="mb-4 flex items-center gap-2 text-sm font-bold text-[#235039]"><Sparkles className="size-5"/>Tu asistente de finca</div>
   <div className="max-h-72 space-y-3 overflow-y-auto">{s.history.map((h,i)=><div key={i} className="space-y-2"><p className="rounded-2xl bg-[#edf3e9] p-3 text-sm">{h.question}</p><p className="ml-8 rounded-2xl bg-[#f5f5f1] p-3 text-sm">{h.answer}</p></div>)}</div>
   <p className="mt-5 rounded-2xl bg-[#e9f1e8] p-4 text-base font-medium leading-7 text-[#243d2a]">{s.question}</p>
   <form className="mt-4 space-y-3" onSubmit={e=>{e.preventDefault();void send("answer")}}><textarea autoFocus rows={3} maxLength={1800} value={text} onChange={e=>setText(e.target.value)} placeholder={examples[s.step]||"Escribe tu respuesta..."} className="w-full rounded-2xl border border-[#d6e3d4] p-4 text-sm outline-none focus:ring-2 focus:ring-[#90ab96]"/><button disabled={busy||!text.trim()} className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#245136] px-5 font-bold text-white disabled:opacity-50">{busy?"Guardando...":"Responder y continuar"}<Send className="ml-2 size-4"/></button></form>
   <button disabled={busy} onClick={()=>void send("reset")} className="mt-4 inline-flex items-center gap-2 text-xs text-[#8d6d3d]"><RotateCcw className="size-4"/>Reiniciar borrador</button>
  </section>}
 </div>;
}
