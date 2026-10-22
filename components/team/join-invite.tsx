"use client";
import { useState } from "react";
export function JoinInvite({token}:{token:string}) {
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 async function accept(){
  setBusy(true);setError("");
  try{
   const r=await fetch("/api/team/accept",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token})});
   const json=await r.json();if(!r.ok)throw Error(json.error||"No se pudo aceptar");
   window.location.assign("/dashboard");
  }catch(e){setError(e instanceof Error?e.message:"Error");setBusy(false)}
 }
 return <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-5 px-5">
  <h1 className="text-3xl font-bold">Invitación a GanadIA</h1>
  <p className="text-sm leading-6">Inicia sesión o regístrate en Clerk usando exactamente el correo invitado, y después regresa a este enlace para aceptar tu acceso a la empresa y a las fincas asignadas.</p>
  <a href="/login" className="rounded-xl border px-5 py-3 text-center font-bold">Iniciar sesión</a>
  <a href="/register" className="rounded-xl border px-5 py-3 text-center font-bold">Crear cuenta</a>
  <button type="button" disabled={busy||!token} onClick={()=>void accept()} className="rounded-xl bg-[#234a34] px-5 py-3 font-bold text-white disabled:opacity-40">{busy?"Validando...":"Aceptar invitación con mi sesión"}</button>
  {error&&<p role="alert" className="text-red-700">{error}</p>}
 </main>;
}