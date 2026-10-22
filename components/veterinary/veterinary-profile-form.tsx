"use client";
import { useEffect,useState } from "react";
export function VeterinaryProfileForm({userId}:{userId:string}){
 const [name,setName]=useState("");const [license,setLicense]=useState("");
 const [authority,setAuthority]=useState("");const [specialty,setSpecialty]=useState("");const [phone,setPhone]=useState("");
 const [status,setStatus]=useState("");const [saving,setSaving]=useState(false);
 useEffect(()=>{let active=true;void fetch("/api/veterinaria/perfil?userId="+encodeURIComponent(userId),{cache:"no-store"}).then(r=>r.json()).then(d=>{if(!active||!d.profile)return;setName(d.profile.fullName||"");setLicense(d.profile.licenseNumber||"");setAuthority(d.profile.registrationAuthority||"");setSpecialty(d.profile.specialty||"");setPhone(d.profile.phone||"")}).catch(()=>{if(active)setStatus("No se pudo consultar el perfil")});return()=>{active=false}},[userId]);
 async function save(){setSaving(true);setStatus("");try{const r=await fetch("/api/veterinaria/perfil",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId,fullName:name,licenseNumber:license,registrationAuthority:authority,specialty,phone})});const d=await r.json();if(!r.ok)throw Error(d.error||"Error");setStatus("Perfil guardado. Datos profesionales declarados, pendientes de validacion documental.")}catch(e){setStatus(e instanceof Error?e.message:"Error")}finally{setSaving(false)}}
 return <section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold">Mi ficha profesional</h2><p className="my-2 text-sm text-[#65786a]">Estos datos identifican al veterinario dentro de GanadIA. No constituyen verificación oficial de la colegiación.</p><div className="grid gap-3 sm:grid-cols-2">{([
 ["Nombre completo",name,setName],
 ["Colegiación o registro profesional",license,setLicense],
 ["Entidad de registro",authority,setAuthority],
 ["Especialidad",specialty,setSpecialty],
 ["Teléfono",phone,setPhone],
 ] as [string,string,(v:string)=>void][]).map(([label,value,set],i)=><label className="text-sm font-semibold" key={label}>{label}<input required={i<2} value={value} onChange={e=>set(e.target.value)} maxLength={160} className="mt-1 min-h-11 w-full rounded-lg border px-3"/></label>)}</div><button type="button" disabled={saving||name.trim().length<3||license.trim().length<2} onClick={()=>void save()} className="mt-4 min-h-11 rounded-xl bg-[#234a34] px-5 font-bold text-white disabled:opacity-50">{saving?"Guardando…":"Guardar ficha profesional"}</button>{status&&<p role="status" className="mt-3 text-sm">{status}</p>}</section>;
}