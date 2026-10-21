"use client";
import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {ArrowLeft,ArrowRightLeft,CheckCircle2,LoaderCircle,MapPin} from "lucide-react";
type Farm={id:string;name:string};
type Animal={id:string;internalCode:string;visualIdentification:string|null;currentWeightKg:string|null};
type Area={id:string;farmId:string;name:string;kind:string};
type Move={id:string;fromFarmId:string;toFarmId:string;fromAreaId:string|null;toAreaId:string|null;movementDate:string;reason:string;createdAt:string;animals:{codeSnapshot:string}[]};
type Payload={farms:Farm[];animals:Animal[];areas:Area[];moves:Move[]};
export function LivestockMovementsClient({farmId,farmName,editable}:{farmId:string;farmName:string;editable:boolean}){
 const [data,setData]=useState<Payload|null>(null);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [success,setSuccess]=useState("");
 const [ids,setIds]=useState<string[]>([]);
 const [destination,setDestination]=useState(farmId);
 const [fromArea,setFromArea]=useState("");
 const [toArea,setToArea]=useState("");
 const [reason,setReason]=useState("Rotación de potrero");
 const [notes,setNotes]=useState("");
 const [date,setDate]=useState(()=>new Date().toISOString().slice(0,10));
 const [requestKey,setRequestKey]=useState(()=>crypto.randomUUID());
 const endpoint="/api/farms/"+encodeURIComponent(farmId)+"/movements";
 const reload=useCallback(async()=>{
  try{const res=await fetch(endpoint,{cache:"no-store"});if(!res.ok)throw Error("No se pudo cargar el inventario");setData(await res.json());setError("");}
  catch(e){setError(e instanceof Error?e.message:"Error de conexión")}
  finally{setLoading(false)}
 },[endpoint]);
 useEffect(()=>{void reload()},[reload]);
 const input="min-h-11 w-full rounded-xl border border-[#dbe4dc] bg-white px-3 text-base text-[#29432f]";
 async function submit(){
  if(!editable||busy)return;
  setError("");setSuccess("");setBusy(true);
  try{
   const res=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
    fromFarmId:farmId,toFarmId:destination,fromAreaId:fromArea||null,toAreaId:toArea||null,animalIds:ids,reason,notes,movementDate:date,requestKey
   })});const j=await res.json();if(!res.ok)throw Error(j.error??"Error al registrar");
   setSuccess("Traslado registrado: "+j.count+" animal(es). Se actualizó su finca y quedó un historial auditable.");
   setIds([]);setRequestKey(crypto.randomUUID());await reload();
  }catch(e){setError(e instanceof Error?e.message:"No se pudo registrar")}finally{setBusy(false)}
 }
 return <div className="mx-auto max-w-5xl space-y-5 pb-8">
  <Link href={"/farms/"+encodeURIComponent(farmId)} className="inline-flex items-center gap-2 text-sm font-semibold text-[#8a6a3f]"><ArrowLeft className="size-4"/> Volver a la finca</Link>
  <header className="rounded-[24px] bg-[#203f2b] p-5 text-white sm:p-7">
   <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#d5b985]">GanadIA · Trazabilidad</p>
   <h1 className="mt-2 text-2xl font-bold sm:text-4xl">Rotación y movimientos</h1>
   <p className="mt-2 text-sm leading-6 text-white/80">{farmName} · Traslados internos entre potreros, fundaciones y fincas del mismo operador.</p>
  </header>
  {loading?<p className="flex items-center gap-2 text-sm"><LoaderCircle className="size-5 animate-spin"/> Cargando ubicación del ganado...</p>:null}
  {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
  {success&&<p role="status" className="flex gap-2 rounded-xl bg-green-50 p-3 text-sm text-green-800"><CheckCircle2 className="size-5 shrink-0"/>{success}</p>}
  {data&&<><div className="grid grid-cols-2 gap-3">
   <div className="rounded-2xl border bg-white p-4"><span className="text-xs text-[#768579]">Ganado actualmente aquí</span><p className="mt-2 text-3xl font-bold text-[#23402b]">{data.animals.length}</p></div>
   <div className="rounded-2xl border bg-white p-4"><span className="text-xs text-[#768579]">Movimientos recientes</span><p className="mt-2 text-3xl font-bold text-[#23402b]">{data.moves.length}</p></div>
  </div>
  {editable&&<section className="space-y-4 rounded-3xl border bg-white p-4 sm:p-6">
   <h2 className="flex items-center gap-2 text-lg font-bold text-[#24412d]"><ArrowRightLeft className="size-5"/> Nuevo movimiento</h2>
   <p className="text-xs leading-5 text-[#708274]">Los cambios se confirman y registran inmediatamente. No emite guías oficiales de movilización.</p>
   <div className="grid gap-4 sm:grid-cols-2">
    <label className="space-y-1 text-xs font-semibold">Finca de origen<input className={input} value={farmName} disabled/></label>
    <label className="space-y-1 text-xs font-semibold">Finca de destino
     <select className={input} value={destination} onChange={e=>{setDestination(e.target.value);setToArea("");setReason(e.target.value===farmId?"Rotación de potrero":"Traslado interno entre fincas")}}>
      {data.farms.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
     </select>
    </label>
    <label className="space-y-1 text-xs font-semibold">Origen (potrero o fundación)
     <select className={input} value={fromArea} onChange={e=>setFromArea(e.target.value)}>
      <option value="">Sin ubicación territorial previa</option>
      {data.areas.filter(a=>a.farmId===farmId).map(a=><option key={a.id} value={a.id}>{a.name} · {a.kind==="FOUNDATION"?"Fundación":"Potrero"}</option>)}
     </select>
    </label>
    <label className="space-y-1 text-xs font-semibold">Destino (potrero o fundación)
     <select className={input} value={toArea} onChange={e=>setToArea(e.target.value)}>
      <option value="">Sin potrero o fundación</option>
      {data.areas.filter(a=>a.farmId===destination).map(a=><option key={a.id} value={a.id}>{a.name} · {a.kind==="FOUNDATION"?"Fundación":"Potrero"}</option>)}
     </select>
    </label>
    <label className="space-y-1 text-xs font-semibold">Fecha<input type="date" className={input} value={date} onChange={e=>setDate(e.target.value)}/></label>
    <label className="space-y-1 text-xs font-semibold">Motivo<input maxLength={120} className={input} value={reason} onChange={e=>setReason(e.target.value)}/></label>
   </div>
   <div><div className="flex items-center justify-between gap-2">
    <label className="text-xs font-bold">Seleccionar animales ({ids.length} / 100 por movimiento)</label>
    {data.animals.length>0&&<button className="text-xs font-semibold text-[#816438]" onClick={()=>setIds(ids.length?[]:data.animals.slice(0,100).map(a=>a.id))} type="button">{ids.length?"Deseleccionar":"Seleccionar primeros 100"}</button>}
   </div>
   <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border">
    {data.animals.length===0?<p className="p-4 text-sm text-[#7b887e]">Registra ganado en esta finca para crear movimientos.</p>:data.animals.map(a=><label key={a.id} className="flex min-h-12 items-center gap-3 border-b px-3 py-2 text-sm">
     <input type="checkbox" checked={ids.includes(a.id)} onChange={e=>setIds(old=>e.target.checked?(old.length>=100?old:[...old,a.id]):old.filter(x=>x!==a.id))}/>
     <span className="flex-1"><strong>{a.internalCode}</strong>{a.visualIdentification?" · "+a.visualIdentification:""}</span>
     <span className="text-xs text-[#758476]">{a.currentWeightKg?Number(a.currentWeightKg).toLocaleString("es-VE")+" kg":"Sin peso"}</span>
    </label>)}
   </div></div>
   <label className="block space-y-1 text-xs font-semibold">Observaciones (opcional)<textarea className={input+" min-h-20 py-2"} maxLength={500} value={notes} onChange={e=>setNotes(e.target.value)}/></label>
   <button onClick={submit} type="button" disabled={busy||!ids.length||(farmId===destination&&fromArea===toArea)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#795c31] px-4 text-sm font-bold text-white disabled:opacity-40">{busy?"Registrando...":"Confirmar traslado de "+ids.length+" animal(es)"}</button>
  </section>}
  <section className="rounded-3xl border bg-white p-4 sm:p-6">
   <h2 className="mb-3 text-lg font-bold text-[#24412d]">Historial de movimientos</h2>
   {data.moves.length===0?<p className="text-sm text-[#788579]">Todavía no hay movimientos registrados.</p>:data.moves.map(m=><article key={m.id} className="border-t py-3">
    <div className="flex items-start justify-between gap-2"><strong className="text-sm">{m.reason}</strong><span className="text-xs text-[#748476]">{new Date(m.movementDate).toLocaleDateString("es-VE")}</span></div>
    <p className="mt-1 text-xs text-[#697b6d]">{data.farms.find(f=>f.id===m.fromFarmId)?.name??"Finca"} → {data.farms.find(f=>f.id===m.toFarmId)?.name??"Finca"} · {m.animals.length} animales</p>
    <p className="mt-1 text-xs text-[#697b6d]">{m.animals.slice(0,8).map(a=>a.codeSnapshot).join(", ")}{m.animals.length>8?" …":""}</p>
   </article>)}
  </section></>}
 </div>;
}