"use client";
import { useState } from "react";
type Animal={id:string;internalCode:string;visualIdentification:string|null};
export function VeterinaryClinicalForm({farmId,animals,onSaved}:{farmId:string;animals:Animal[];onSaved:()=>Promise<void>}){
 const [kind,setKind]=useState<"vaccination"|"treatment">("vaccination");
 const [animalId,setAnimalId]=useState("");
 const [name,setName]=useState("");const [appliedAt,setAppliedAt]=useState(new Date().toISOString().slice(0,10));
 const [followUpAt,setFollowUpAt]=useState("");const [dose,setDose]=useState("");const [batch,setBatch]=useState("");
 const [diagnosis,setDiagnosis]=useState("");const [medicine,setMedicine]=useState("");const [note,setNote]=useState("");
 const [busy,setBusy]=useState(false);const [status,setStatus]=useState("");const [saved,setSaved]=useState(false);
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setStatus("");setSaved(false);setBusy(true);
  try{const response=await fetch("/api/veterinaria/atenciones",{method:"POST",headers:{"Content-Type":"application/json"},
   body:JSON.stringify({kind,farmId,animalId,name,appliedAt,followUpAt:followUpAt||undefined,dose,batch,diagnosis,medicine,note})});
   const result=await response.json();if(!response.ok)throw Error(result.error||"Error al guardar");
   setSaved(true);setStatus("Atención guardada y vinculada a tu ficha profesional. Registro: "+result.id);
   setName("");setNote("");setDose("");setBatch("");setDiagnosis("");setMedicine("");setFollowUpAt("");
   await onSaved();
  }catch(e){setStatus(e instanceof Error?e.message:"No se pudo guardar")}finally{setBusy(false)}
 }
 return <form onSubmit={e=>void submit(e)} className="space-y-3 rounded-2xl border border-[#dce7d9] bg-white p-5">
  <h2 className="text-lg font-bold text-[#234a34]">Registrar atención sanitaria</h2>
  <p className="text-xs text-[#586c5d]">El sistema valida tu finca y ficha profesional en cada registro. No reemplaza la valoración clínica.</p>
  <label className="block text-sm font-semibold">Tipo<select value={kind} onChange={e=>setKind(e.target.value as typeof kind)} className="mt-1 min-h-11 w-full rounded-lg border px-3"><option value="vaccination">Vacunación</option><option value="treatment">Tratamiento</option></select></label>
  <label className="block text-sm font-semibold">Animal<select value={animalId} required onChange={e=>setAnimalId(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border px-3"><option value="">Selecciona un animal</option>{animals.map(a=><option key={a.id} value={a.id}>{a.internalCode}{a.visualIdentification?" · "+a.visualIdentification:""}</option>)}</select></label>
  <label className="block text-sm font-semibold">{kind==="vaccination"?"Vacuna aplicada":"Tratamiento realizado"}<input value={name} onChange={e=>setName(e.target.value)} minLength={2} maxLength={160} required className="mt-1 min-h-11 w-full rounded-lg border px-3"/></label>
  <div className="grid gap-3 sm:grid-cols-2">
   <label className="block text-sm font-semibold">Fecha de aplicación<input type="date" required value={appliedAt} max={new Date().toISOString().slice(0,10)} onChange={e=>setAppliedAt(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border px-3"/></label>
   <label className="block text-sm font-semibold">{kind==="vaccination"?"Próxima dosis (opcional)":"Fin de retiro (opcional)"}<input type="date" min={appliedAt} value={followUpAt} onChange={e=>setFollowUpAt(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border px-3"/></label>
   <label className="block text-sm font-semibold">Dosis<input value={dose} maxLength={100} onChange={e=>setDose(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border px-3"/></label>
   {kind==="vaccination"?<label className="block text-sm font-semibold">Lote de vacuna<input value={batch} maxLength={120} onChange={e=>setBatch(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border px-3"/></label>:<>
    <label className="block text-sm font-semibold">Medicamento<input value={medicine} maxLength={160} onChange={e=>setMedicine(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border px-3"/></label>
    <label className="block text-sm font-semibold">Diagnóstico<input value={diagnosis} maxLength={500} onChange={e=>setDiagnosis(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border px-3"/></label></>}
  </div>
  <label className="block text-sm font-semibold">Observaciones<textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={1000} rows={3} className="mt-1 w-full rounded-lg border px-3 py-2"/></label>
  <button disabled={busy||!animalId||!name.trim()} className="min-h-12 rounded-xl bg-[#234a34] px-5 font-bold text-white disabled:opacity-50">{busy?"Registrando…":"Guardar atención"}</button>
  {status&&<p role="status" className={saved?"text-sm text-green-800":"text-sm text-red-700"}>{status}</p>}
 </form>;
}