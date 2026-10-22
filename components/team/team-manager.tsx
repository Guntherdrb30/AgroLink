"use client";
import { useEffect,useState } from "react";
type Farm={id:string;name:string};
type Member={userId:string;role:string;user:{email:string;name:string|null};farms:string[]};
type Invite={id:string;email:string;role:string;status:string;expiresAt:string};
export function TeamManager({canInviteAdmins}:{canInviteAdmins:boolean}){
 const [members,setMembers]=useState<Member[]>([]);
 const [invitations,setInvitations]=useState<Invite[]>([]);
 const [farms,setFarms]=useState<Farm[]>([]);
 const [email,setEmail]=useState("");
 const [role,setRole]=useState("ACCOUNTING");
 const [ids,setIds]=useState<string[]>([]);
 const [url,setUrl]=useState("");
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 async function load(){const r=await fetch("/api/team",{cache:"no-store"});if(r.ok){const d=await r.json();setMembers(d.members);setInvitations(d.invitations);setFarms(d.farms)}}
 useEffect(()=>{void load()},[]);
 async function invite(){setBusy(true);setError("");setUrl("");try{
  const r=await fetch("/api/team",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,role,farmIds:role==="TENANT_ADMIN"?[]:ids})});
  const j=await r.json();if(!r.ok)throw Error(j.error||"Error");setUrl(j.invitationUrl);setEmail("");await load();
 }catch(e){setError(e instanceof Error?e.message:"Error")}finally{setBusy(false)}}
 return <div className="space-y-6">
  <section className="rounded-3xl border bg-white p-5"><h2 className="text-xl font-bold">Invitar miembro</h2><p className="my-2 text-sm text-[#728075]">Enlace privado de un solo uso. Válido siete días y únicamente para el correo verificado en Clerk.</p>
   <label className="block py-2 text-sm font-medium">Correo<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 h-12 w-full rounded-xl border px-3"/></label>
   <label className="block py-2 text-sm font-medium">Rol<select value={role} onChange={e=>setRole(e.target.value)} className="mt-1 h-12 w-full rounded-xl border px-3">{canInviteAdmins&&<option value="TENANT_ADMIN">Administrador</option>}<option value="FARM_MANAGER">Encargado de finca</option><option value="ACCOUNTING">Contador</option><option value="VETERINARIAN">Veterinario</option><option value="OPERATOR">Operador</option></select></label>
   {role!=="TENANT_ADMIN"&&<fieldset className="space-y-2 py-3"><legend className="text-sm font-bold">Fincas autorizadas</legend>{farms.map(f=><label key={f.id} className="flex min-h-10 items-center gap-3"><input type="checkbox" checked={ids.includes(f.id)} onChange={e=>setIds(a=>e.target.checked?[...a,f.id]:a.filter(x=>x!==f.id))}/>{f.name}</label>)}</fieldset>}
   <button type="button" disabled={busy} onClick={()=>void invite()} className="min-h-12 rounded-xl bg-[#234a34] px-5 font-bold text-white disabled:opacity-40">Crear invitación</button>
   {error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
   {url&&<div className="mt-4 rounded-xl bg-[#f1f5ed] p-3"><p className="text-sm font-semibold">Enlace exclusivo para el destinatario:</p><input value={url} readOnly className="my-2 w-full rounded-lg border px-2 py-2 text-xs"/><button type="button" onClick={()=>void navigator.clipboard.writeText(url)} className="text-sm font-bold underline">Copiar enlace privado</button><p className="mt-2 text-xs">Compártelo solo con la persona invitada; no se envía correo automáticamente.</p></div>}
  </section>
  <section className="rounded-3xl border bg-white p-5"><h2 className="mb-3 text-xl font-bold">Miembros ({members.length})</h2>{members.map(m=><div className="border-t py-3" key={m.userId}><p className="font-semibold">{m.user.name||m.user.email}</p><p className="text-xs">{m.user.email} · {m.role}</p><p className="text-xs text-[#657667]">Fincas: {m.role==="TENANT_OWNER"||m.role==="TENANT_ADMIN"?"todas":(m.farms.map(id=>farms.find(f=>f.id===id)?.name||id).join(", ")||"ninguna")}</p></div>)}</section>
  <section className="rounded-3xl border bg-white p-5"><h2 className="mb-2 text-xl font-bold">Invitaciones</h2>{invitations.map(i=><p className="border-t py-2 text-sm" key={i.id}>{i.email} · {i.role} · {i.status}</p>)}</section>
 </div>;
}