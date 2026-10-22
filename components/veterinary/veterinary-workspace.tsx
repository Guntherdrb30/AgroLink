"use client";
import { useState } from "react";
import { VeterinaryClinicalForm } from "@/components/veterinary/veterinary-clinical-form";
type Farm={id:string;name:string};
type Animal={id:string;internalCode:string;visualIdentification:string|null;healthStatus:string;reproductiveStatus:string;chipCode:string|null;sex:string;vaccinationRecords:{id:string;vaccineName:string;appliedAt:string;nextDueAt:string|null;note:string|null}[];treatmentRecords:{id:string;treatmentName:string;appliedAt:string;diagnosis:string|null;withdrawalUntil:string|null}[]};
export function VeterinaryWorkspace({farms,canRecord=false}:{farms:Farm[];canRecord?:boolean}){
 const [selected,setSelected]=useState("");const [animals,setAnimals]=useState<Animal[]>([]);const [loading,setLoading]=useState(false);const [error,setError]=useState("");
 async function load(id:string){setSelected(id);setAnimals([]);setError("");if(!id)return;setLoading(true);try{const r=await fetch("/api/veterinaria?farmId="+encodeURIComponent(id),{cache:"no-store"});const data=await r.json();if(!r.ok)throw Error(data.error||"No autorizado");setAnimals(data.animals)}catch(e){setError(e instanceof Error?e.message:"Error de consulta")}finally{setLoading(false)}}
 return <div className="mx-auto max-w-5xl space-y-5">
  <header className="rounded-3xl bg-[#234a34] p-6 text-white"><p className="text-xs font-bold uppercase tracking-widest text-[#e6c783]">GanadIA · Gestión sanitaria</p><h1 className="mt-2 text-3xl font-bold">Área veterinaria</h1><p className="mt-2 text-sm text-white/80">Fichas y registros sanitarios de las fincas que tienes autorizadas.</p></header>
  <label className="block text-sm font-bold">Selecciona tu finca<select className="mt-2 min-h-12 w-full rounded-xl border bg-white px-3" value={selected} onChange={e=>void load(e.target.value)}><option value="">Seleccionar finca</option>{farms.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
  {error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
  {loading&&<p>Consultando registros sanitarios…</p>}
  {!farms.length&&<p className="rounded-xl border bg-white p-4">Aún no tienes fincas asignadas.</p>}
  {selected&&!loading&&<p className="text-sm font-medium">{animals.length} animales recuperados (máximo 500 por consulta).</p>}
  {selected&&canRecord&&<VeterinaryClinicalForm key={selected} farmId={selected} animals={animals} onSaved={async()=>{await load(selected)}}/>}
  <div className="grid gap-3 sm:grid-cols-2">{animals.map(a=><article key={a.id} className="space-y-2 rounded-2xl border bg-white p-4">
   <h2 className="font-bold">{a.internalCode} {a.visualIdentification?"· "+a.visualIdentification:""}</h2><p className="text-sm">Sanidad: {a.healthStatus} · Reproducción: {a.reproductiveStatus}</p>
   <p className="text-xs">Identificación electrónica: {a.chipCode||"No registrada"}</p>
   <h3 className="text-sm font-bold">Vacunas recientes</h3>
   {a.vaccinationRecords.length?a.vaccinationRecords.map(v=><p key={v.id} className="text-xs">{v.vaccineName} · {new Date(v.appliedAt).toLocaleDateString("es-VE")}</p>):<p className="text-xs text-[#718074]">Sin vacunas registradas</p>}
   <h3 className="text-sm font-bold">Tratamientos recientes</h3>
   {a.treatmentRecords.length?a.treatmentRecords.map(t=><p key={t.id} className="text-xs">{t.treatmentName} · {new Date(t.appliedAt).toLocaleDateString("es-VE")}</p>):<p className="text-xs text-[#718074]">Sin tratamientos registrados</p>}
  </article>)}</div>
  <p className="text-xs text-[#768679]">Las atenciones nuevas se registran con identidad profesional, finca autorizada y auditoría. Los registros existentes permanecen intactos.</p>
 </div>
}