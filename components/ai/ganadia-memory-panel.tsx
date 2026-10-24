"use client";
import {useCallback,useEffect,useState} from "react";
import {Brain,Check,Trash2,Plus,ShieldCheck,RefreshCw,Sparkles,Building2} from "lucide-react";
type Style="SHORT"|"BALANCED"|"DETAILED";
type Settings={enabled:boolean;learnFromChat:boolean;preferredName:string|null;responseStyle:Style};
type Fact={id:string;kind:string;content:string;status:string;origin:string;farmId:string|null;evidenceCount:number};
type Org={id:string;farmId:string|null;content:string};
type Profile={identity:{name:string;company:string;role:string};settings:Settings;facts:Fact[];organization:Org[];
 patterns:{topic:string;occurrences:number;activeDays:number}[];farms:{id:string;name:string}[];canManageCompany:boolean};
const API="/api/ganadia-ai/memoria";
const inp="min-h-11 w-full rounded-xl border border-[#d6e0d4] bg-white px-3 py-2 text-sm text-[#253f2e]";
export function GanadiaMemoryPanel(){
 const [profile,setProfile]=useState<Profile|null>(null);
 const [form,setForm]=useState<Settings>({enabled:false,learnFromChat:false,preferredName:null,responseStyle:"BALANCED"});
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [notice,setNotice]=useState(""),[error,setError]=useState("");
 const [personal,setPersonal]=useState(""),[kind,setKind]=useState("WORKFLOW"),[farmId,setFarmId]=useState("");
 const [companyNote,setCompanyNote]=useState(""),[companyFarm,setCompanyFarm]=useState("");
 const refresh=useCallback(async()=>{
  const r=await fetch(API,{cache:"no-store"});const data=await r.json();
  if(!r.ok)throw Error(data.error||"No fue posible cargar tu memoria");
  setProfile(data);setForm(data.settings);
 },[]);
 useEffect(()=>{let active=true;setLoading(true);
  void refresh().catch(e=>{if(active)setError(String(e))}).finally(()=>{if(active)setLoading(false)});
  return()=>{active=false};
 },[refresh]);
 async function call(path:string,method:string,body?:unknown){
  if(busy)return;setBusy(true);setNotice("");setError("");
  try{
   const res=await fetch(path,{method,cache:"no-store",headers:body===undefined?undefined:{"Content-Type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});
   const data=await res.json();
   if(!res.ok)throw Error(data.error||"La operación no pudo completarse");
   await refresh();setNotice("Cambios guardados.");
  }catch(e){setError(e instanceof Error?e.message:"No fue posible guardar");}
  finally{setBusy(false);}
 }
 async function addPersonal(){
  if(!personal.trim())return;
  await call(API,"POST",{scope:"personal",kind,content:personal,farmId:farmId||null});
  setPersonal("");
 }
 async function addCompany(){
  if(!companyNote.trim())return;
  await call(API,"POST",{scope:"organization",content:companyNote,farmId:companyFarm||null});
  setCompanyNote("");
 }
 async function suggestWithOpenAI(){
  if(busy||!form.enabled||!form.learnFromChat)return;
  if(!window.confirm("¿Quieres analizar tus consultas recientes con OpenAI? Utilizará el presupuesto piloto habilitado. Los recuerdos sugeridos no se guardan como preferencias activas hasta que los apruebes."))return;
  setBusy(true);setNotice("");setError("");
  try{
   const res=await fetch(API+"/sugerencias",{method:"POST",cache:"no-store"});
   const data=await res.json();
   if(!res.ok)throw Error(data.error||"No se pudieron obtener sugerencias");
   await refresh();setNotice(data.suggested?"OpenAI propuso "+data.suggested+" recuerdo(s). Revísalos antes de aprobar.":"No se encontraron preferencias estables nuevas.");
  }catch(e){setError(e instanceof Error?e.message:"No se pudo analizar");}
  finally{setBusy(false);}
 }
 const canManage=profile?.canManageCompany??false;
 if(loading)return <p className="p-6 text-[#536e5b]">Cargando la memoria de GanadIA...</p>;
 if(!profile)return <p className="p-6 text-red-700">{error||"No se pudo abrir tu memoria."}</p>;
 return <main className="mx-auto max-w-4xl space-y-5 pb-24">
  <header className="rounded-3xl bg-[#214833] p-6 text-white sm:p-8">
   <div className="flex items-center gap-3"><Brain className="size-8 text-[#e5cf91]"/><div><p className="text-xs uppercase tracking-widest text-[#e5cf91]">GanadIA AI Elite</p><h1 className="text-2xl font-bold sm:text-3xl">Mi memoria inteligente</h1></div></div>
   <p className="mt-3 max-w-xl text-sm leading-6 text-white/80">Tú decides qué recuerda GanadIA. La información de tu finca y los pesos se consultan siempre en el sistema, no en tus recuerdos.</p>
  </header>
  {notice&&<div role="status" className="rounded-xl bg-[#e9f5e6] p-3 text-sm text-[#285436]">{notice}</div>}
  {error&&<div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</div>}
  <section className="space-y-4 rounded-3xl border bg-white p-5 sm:p-6">
   <div><h2 className="text-xl font-bold text-[#244e33]">Tu identidad y preferencias</h2><p className="mt-1 text-sm text-[#687d6d]">{profile.identity.name||"Usuario"} · {profile.identity.company}</p></div>
   <label className="flex items-center justify-between gap-4 rounded-xl bg-[#f5f8f4] p-3 text-sm font-semibold">
    <span>Permitir memoria personal <small className="mt-1 block font-normal text-[#687d6d]">Recupera preferencias que tú apruebes.</small></span>
    <input type="checkbox" className="size-5" checked={form.enabled} onChange={e=>setForm(v=>({...v,enabled:e.target.checked,learnFromChat:e.target.checked?v.learnFromChat:false}))}/>
   </label>
   <label className="flex items-center justify-between gap-4 rounded-xl bg-[#f5f8f4] p-3 text-sm font-semibold">
    <span>Aprender de mis consultas <small className="mt-1 block font-normal text-[#687d6d]">Detecta temas frecuentes y propone recuerdos. Nunca los activa sin aprobación.</small></span>
    <input type="checkbox" className="size-5" disabled={!form.enabled} checked={form.learnFromChat} onChange={e=>setForm(v=>({...v,learnFromChat:e.target.checked}))}/>
   </label>
   <div className="grid gap-4 sm:grid-cols-2">
    <label className="space-y-1 text-sm font-semibold">Cómo quieres que te llame
     <input className={inp} maxLength={80} placeholder={profile.identity.name||"Nombre preferido"} value={form.preferredName||""} onChange={e=>setForm(v=>({...v,preferredName:e.target.value}))}/>
    </label>
    <label className="space-y-1 text-sm font-semibold">Extensión de las respuestas
     <select className={inp} value={form.responseStyle} onChange={e=>setForm(v=>({...v,responseStyle:e.target.value as Style}))}>
      <option value="SHORT">Breves y directas</option><option value="BALANCED">Equilibradas</option><option value="DETAILED">Con más detalle</option>
     </select>
    </label>
   </div>
   <button disabled={busy} onClick={()=>void call(API,"PATCH",{...form,preferredName:form.preferredName||null})} className="min-h-11 w-full rounded-xl bg-[#254e32] px-5 font-semibold text-white disabled:opacity-40"><Check className="mr-2 inline size-4"/>Guardar mis preferencias</button>
  </section>
  <section className="space-y-3 rounded-3xl border bg-white p-5 sm:p-6">
   <div className="flex items-center gap-2"><Sparkles className="size-5 text-[#557f56]"/><h2 className="text-xl font-bold text-[#244e33]">Lo que GanadIA recuerda</h2></div>
   <p className="text-sm text-[#687d6d]">Los recuerdos sugeridos no se usan hasta que tú los apruebes. Puedes editarlos o borrarlos en cualquier momento.</p>
   <button disabled={busy||!form.enabled||!form.learnFromChat} onClick={()=>void suggestWithOpenAI()} className="min-h-11 rounded-xl border border-[#8eaf91] px-4 text-sm font-semibold text-[#285437] disabled:opacity-40"><Sparkles className="mr-2 inline size-4"/>Proponer recuerdos con OpenAI</button>
   <p className="text-xs text-[#738373]">Opcional: analiza tus mensajes recientes con cargo al presupuesto piloto vigente. Nunca activa recuerdos automáticamente.</p>
   {profile.facts.length===0?<p className="rounded-xl bg-[#f5f8f4] p-4 text-sm">Todavía no hay recuerdos guardados.</p>:profile.facts.map(f=>
    <article key={f.id} className="space-y-2 rounded-xl border p-3">
     <div className="flex flex-wrap justify-between gap-2 text-xs text-[#6e816e]"><span>{f.status==="SUGGESTED"?"Sugerencia por aprobar":f.status==="ACTIVE"?"Recuerdo activo":"Descartado"} · {f.origin}</span><span>{f.farmId?profile.farms.find(x=>x.id===f.farmId)?.name||"Finca":"Personal general"}</span></div>
     <p className="text-sm leading-6 text-[#263b2c]">{f.content}</p>
     <div className="flex flex-wrap gap-2">
      {f.status==="SUGGESTED"&&<button disabled={busy} onClick={()=>void call(API+"/"+f.id,"PATCH",{scope:"personal",status:"ACTIVE"})} className="rounded-lg bg-[#e2f2e0] px-3 py-2 text-xs font-semibold text-[#28513a]">Aprobar recuerdo</button>}
      <button disabled={busy} onClick={()=>{const s=window.prompt("Corregir recuerdo",f.content);if(s&&s!==f.content)void call(API+"/"+f.id,"PATCH",{scope:"personal",content:s})}} className="rounded-lg border px-3 py-2 text-xs">Editar</button>
      <button disabled={busy} onClick={()=>{if(window.confirm("¿Borrar este recuerdo?"))void call(API+"/"+f.id+"?scope=personal","DELETE")}} className="rounded-lg border px-3 py-2 text-xs text-red-800" data-scope="personal" aria-label="Borrar recuerdo">Borrar</button>
     </div>
    </article>
   )}
   <div className="space-y-2 border-t pt-4"><h3 className="font-semibold">Añadir un recuerdo propio</h3>
    <div className="grid gap-2 sm:grid-cols-2"><select className={inp} value={kind} onChange={e=>setKind(e.target.value)}>
     <option value="COMMUNICATION">Forma de comunicarse</option><option value="WORKFLOW">Forma de trabajar</option><option value="INTEREST">Temas habituales</option><option value="CATTLE_CRITERION">Criterios de ganado</option><option value="OTHER">Otra preferencia</option>
    </select><select className={inp} value={farmId} onChange={e=>setFarmId(e.target.value)}><option value="">Todas mis fincas autorizadas</option>{profile.farms.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
    <textarea rows={2} maxLength={350} className={inp} placeholder="Ejemplo: prefiero los informes desglosados por finca" value={personal} onChange={e=>setPersonal(e.target.value)}/>
    <button disabled={busy||!form.enabled||!personal.trim()} onClick={()=>void addPersonal()} className="min-h-10 rounded-xl bg-[#244e33] px-4 text-sm font-semibold text-white disabled:opacity-40"><Plus className="mr-2 inline size-4"/>Guardar recuerdo</button>
   </div>
  </section>
  <section className="space-y-3 rounded-3xl border bg-white p-5 sm:p-6">
   <h2 className="flex items-center gap-2 text-xl font-bold text-[#244e33]"><Building2 className="size-5"/>Memoria de la empresa</h2>
   <p className="text-sm text-[#687d6d]">Procedimientos autorizados visibles solo para personal con permiso sobre la empresa y, cuando aplique, la finca.</p>
   {profile.organization.length===0?<p className="text-sm text-[#687d6d]">No hay procedimientos compartidos.</p>:profile.organization.map(o=><div key={o.id} className="rounded-xl border p-3 text-sm">
    <p>{o.content}</p><p className="mt-1 text-xs text-[#748675]">{o.farmId?profile.farms.find(f=>f.id===o.farmId)?.name:"Toda la empresa"}</p>
    {canManage&&<button disabled={busy} className="mt-2 text-xs text-red-800 underline" onClick={()=>{if(window.confirm("¿Eliminar procedimiento de la empresa?"))void call(API+"/"+o.id+"?scope=organization","DELETE")}}>Eliminar</button>}
   </div>)}
   {canManage&&<div className="space-y-2 border-t pt-4">
    <select className={inp} value={companyFarm} onChange={e=>setCompanyFarm(e.target.value)}><option value="">Toda la empresa</option>{profile.farms.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select>
    <textarea className={inp} rows={2} maxLength={350} value={companyNote} onChange={e=>setCompanyNote(e.target.value)} placeholder="Ejemplo: toda guía se revisa antes de confirmar la venta"/>
    <button disabled={busy||!companyNote.trim()} onClick={()=>void addCompany()} className="min-h-10 rounded-xl border border-[#9db49f] px-4 text-sm font-semibold disabled:opacity-40">Guardar procedimiento</button>
   </div>}
  </section>
  <section className="space-y-3 rounded-3xl border bg-white p-5 sm:p-6">
   <h2 className="flex items-center gap-2 text-xl font-bold text-[#244e33]"><RefreshCw className="size-5"/>Patrones de consultas</h2>
   <p className="text-sm text-[#687d6d]">Solo categorías y frecuencias, nunca un perfil oculto. Están disponibles cuando activas el aprendizaje.</p>
   <div className="flex flex-wrap gap-2">{profile.patterns.length?profile.patterns.map(x=><span key={x.topic} className="rounded-lg bg-[#f0f5ed] px-3 py-2 text-xs">{x.topic}: {x.occurrences} consultas · {x.activeDays} días</span>):<span className="text-sm text-[#687d6d]">Sin patrones registrados.</span>}</div>
  </section>
  <section className="space-y-3 rounded-3xl border border-red-100 bg-white p-5 sm:p-6">
   <h2 className="flex items-center gap-2 text-lg font-bold text-[#244e33]"><ShieldCheck className="size-5"/>Privacidad y control</h2>
   <p className="text-sm text-[#687d6d]">Limpiar el chat no elimina los recuerdos aprobados. Si borras toda tu memoria se eliminan tus preferencias y patrones, pero no los registros del ERP ni los procedimientos oficiales de la empresa.</p>
   <a href={API+"/exportar"} className="inline-flex min-h-11 items-center rounded-xl border border-[#a9baaa] px-4 text-sm font-semibold text-[#285437]">Exportar mis recuerdos (JSON)</a>
   <button disabled={busy} onClick={()=>{if(window.confirm("¿Eliminar TODOS tus recuerdos personales y patrones? Esta acción no se puede deshacer."))void call(API,"DELETE",{confirm:"BORRAR_TODA_MI_MEMORIA"})}} className="min-h-11 rounded-xl border border-red-300 px-4 text-sm font-semibold text-red-800 disabled:opacity-40"><Trash2 className="mr-2 inline size-4"/>Borrar toda mi memoria personal</button>
  </section>
 </main>;
}
