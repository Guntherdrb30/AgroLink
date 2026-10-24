"use client";
import { useCallback,useEffect,useMemo,useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2,FileDown,LoaderCircle,ScrollText } from "lucide-react";
type Farm={id:string;name:string};
type Animal={id:string;farmId:string;code:string;sex:string;weightKg:string|null;weightDate:string|null};
type SaleList={id:string;number:string;farmId:string;status:string;buyerName:string;totalWeightKg:string;totalCents:number;currency:string;insaiPermitNumber:string|null;_count:{items:number}};
type SaleDetail={id:string;number:string;status:string;buyerName:string;totalWeightKg:string;currency:string;totalCents:number;farmId:string;items:{codeSnapshot:string;weightKg:string}[]};
export function SalesClient({farms,animals,canEdit}:{farms:Farm[];animals:Animal[];canEdit:boolean}){
 const router=useRouter();
 const [farmId,setFarmId]=useState(farms[0]?.id||"");
 const [selected,setSelected]=useState<string[]>([]);
 const [buyer,setBuyer]=useState("");
 const [document,setDocument]=useState("");
 const [destination,setDestination]=useState("");
 const [guideData,setGuideData]=useState<Record<string,string>>({});
 const [currency,setCurrency]=useState("USD");
 const [price,setPrice]=useState("2.50");
 const [notes,setNotes]=useState("");
 const [key,setKey]=useState(()=>crypto.randomUUID());
 const [sales,setSales]=useState<SaleList[]>([]);
 const [draft,setDraft]=useState<SaleDetail|null>(null);
 const [pending,setPending]=useState(false);
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");
 const [permitNo,setPermitNo]=useState("");
 const [file,setFile]=useState<File|null>(null);
 const [search,setSearch]=useState("");
 const available=useMemo(()=>animals.filter(a=>a.farmId===farmId&&(!search||a.code.toLowerCase().includes(search.toLowerCase()))),[animals,farmId,search]);
 const chosen=useMemo(()=>animals.filter(a=>selected.includes(a.id)),[animals,selected]);
 const totalKg=chosen.reduce((sum,a)=>sum+Number(a.weightKg||0),0);
 const load=useCallback(async()=>{try{const r=await fetch("/api/livestock-sales",{cache:"no-store"});if(r.ok)setSales((await r.json()).sales||[]);}catch{}},[]);
 useEffect(()=>{void load()},[load]);
 async function create(){
  if(!canEdit||pending||!farmId||!selected.length)return;
  setPending(true);setError("");setMessage("");
  try{
   const p=Math.round(Number(price)*100);
   if(!Number.isSafeInteger(p)||p<0||!buyer.trim())throw Error("Indica comprador y precio por kg.");
   const r=await fetch("/api/livestock-sales",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
    farmId,buyerName:buyer,buyerDocument:document,destination,animalIds:selected,
    pricePerKgCents:p,currency,notes,guideData,requestKey:key,saleDate:new Date().toISOString(),
   })});
   const x=await r.json();if(!r.ok)throw Error(x.error||"No se pudo crear el borrador.");
   const d=await fetch("/api/livestock-sales/"+x.id,{cache:"no-store"});const response=await d.json();
   if(!d.ok)throw Error(response.error||"No se pudo cargar la venta.");
   setDraft(response.sale);setKey(crypto.randomUUID());setMessage("Borrador creado. No se ha descontado ganado.");
   await load();
  }catch(e){setError(e instanceof Error?e.message:"No se pudo preparar la venta");}
  finally{setPending(false);}
 }
 async function confirm(){
  if(!draft||draft.status!=="DRAFT"||pending||!canEdit)return;
  if(!window.confirm("¿Confirmar la venta y retirar "+draft.items.length+" animales del inventario activo? Esta acción genera historial permanente."))return;
  setPending(true);setError("");
  try{
   const r=await fetch("/api/livestock-sales/"+draft.id,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({confirm:true})});
   const x=await r.json();if(!r.ok)throw Error(x.error||"La venta no pudo confirmarse.");
   setMessage("Venta confirmada: "+x.count+" animales marcados como vendidos.");
   setSelected([]);setDraft(null);await load();router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"No se pudo confirmar");}finally{setPending(false);}
 }
 async function uploadPermit(id:string){
  if(!file||!permitNo.trim()||pending)return;setPending(true);setError("");
  try{
   const f=new FormData();f.set("file",file);f.set("permitNumber",permitNo);
   const r=await fetch("/api/livestock-sales/"+id+"/insai",{method:"POST",body:f});
   const x=await r.json();if(!r.ok)throw Error(x.error||"No pudo guardarse la guía.");
   setMessage("Soporte INSAI cargado y vinculado a la venta.");setFile(null);setPermitNo("");await load();
  }catch(e){setError(e instanceof Error?e.message:"Error al cargar soporte");}finally{setPending(false);}
 }
 const input="mt-1 min-h-11 w-full rounded-xl border border-[#d8e2d7] bg-white px-3 text-base text-[#2b452f]";
 return <main className="mx-auto max-w-5xl space-y-5 pb-24">
  <header className="rounded-3xl bg-[#23452e] p-5 text-white sm:p-8">
   <p className="text-xs font-bold uppercase tracking-[.16em] text-[#ead19e]">GanadIA · Operación ganadera</p>
   <h1 className="mt-2 text-3xl font-bold">Ventas y guías internas</h1>
   <p className="mt-2 text-sm text-white/80">Comprobante interno para control de ventas. No sustituye permisos INSAI ni factura fiscal.</p>
  </header>
  {error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
  {message&&<p role="status" className="rounded-xl bg-green-50 p-4 text-sm text-green-800">{message}</p>}
  {canEdit&&<section className="space-y-4 rounded-3xl border bg-white p-4 sm:p-6">
   <h2 className="text-xl font-bold text-[#27432d]">Preparar venta</h2>
   <div className="grid gap-3 sm:grid-cols-2">
    <label className="text-sm font-semibold">Finca
     <select className={input} value={farmId} onChange={e=>{setFarmId(e.target.value);setSelected([])}}>{farms.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select>
    </label>
    <label className="text-sm font-semibold">Comprador
     <input className={input} maxLength={150} value={buyer} onChange={e=>setBuyer(e.target.value)} placeholder="Nombre completo o razón social"/>
    </label>
    <label className="text-sm font-semibold">Identificación del comprador
     <input className={input} maxLength={100} value={document} onChange={e=>setDocument(e.target.value)} placeholder="Cédula o RIF"/>
    </label>
    <label className="text-sm font-semibold">Destino
     <input className={input} maxLength={200} value={destination} onChange={e=>setDestination(e.target.value)} placeholder="Finca o lugar de destino"/>
    </label>
    <label className="text-sm font-semibold">Precio por kilogramo
     <input type="number" step="0.01" min="0" className={input} value={price} onChange={e=>setPrice(e.target.value)}/>
    </label>
    <label className="text-sm font-semibold">Moneda
     <select className={input} value={currency} onChange={e=>setCurrency(e.target.value)}><option value="USD">USD</option><option value="VES">Bolívares (VES)</option></select>
    </label>
   </div>
   <div className="rounded-xl border bg-[#f5f8f4] p-4"><h3 className="mb-3 font-semibold text-[#244a33]">Información para la guía premium</h3><div className="grid gap-3 sm:grid-cols-2">{([["buyerAddress","Dirección fiscal del comprador"],["buyerPhone","Teléfono"],["buyerEmail","Correo"],["buyerContact","Persona de contacto"],["destinationAddress","Dirección destino"],["originOwner","Propietario finca"],["originDocument","RIF o cédula emisor"],["originAddress","Dirección de origen"],["originPhone","Teléfono finca"],["farmIron","Código del hierro"],["plannedDeparture","Fecha prevista de salida"],["plannedTime","Hora"],["route","Ruta"],["vehicle","Vehículo"],["vehiclePlate","Placa"],["driverName","Conductor"],["driverDocument","Cédula conductor"],["driverPhone","Teléfono conductor"],["healthNotes","Observación sanitaria"],["paymentTerms","Condición de pago"]] as const).map(([k,label])=><label key={k} className="text-xs font-semibold">{label}<input value={guideData[k]||""} onChange={e=>setGuideData(o=>({...o,[k]:e.target.value}))} maxLength={350} className={input} /></label>)}</div><p className="mt-3 text-xs text-[#5b6e60]">Puedes preparar el borrador con campos pendientes. Verifica la información antes de autorizar y transportar ganado.</p></div>
   <label className="block text-sm font-semibold">Observaciones
    <textarea className={input+" py-3"} rows={2} maxLength={1000} value={notes} onChange={e=>setNotes(e.target.value)}/>
   </label>
   <div className="flex items-center justify-between gap-3">
    <h3 className="font-semibold">Selecciona animales ({selected.length}/100)</h3>
    <span className="text-sm text-[#627866]">{totalKg.toLocaleString("es-VE")} kg</span>
   </div>
   <input className={input} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por código de animal"/>
   <div className="max-h-72 overflow-y-auto rounded-xl border">
    {available.map(a=><label key={a.id} className="flex min-h-14 items-center gap-3 border-b p-3 text-sm">
     <input type="checkbox" checked={selected.includes(a.id)} onChange={e=>setSelected(prev=>e.target.checked?(prev.length>=100?prev:[...prev,a.id]):prev.filter(id=>id!==a.id))}/>
     <span className="min-w-0 flex-1"><strong>{a.code}</strong><span className="block text-xs text-[#69786a]">{a.weightDate?"Pesaje "+a.weightDate:"Peso de ficha (no confirmado)"}</span></span>
     <span className="font-semibold">{a.weightKg?Number(a.weightKg).toLocaleString("es-VE")+" kg":"Sin peso"}</span>
    </label>)}
   </div>
   <button disabled={pending||!selected.length||!buyer.trim()} onClick={()=>void create()} className="min-h-12 w-full rounded-xl bg-[#254e32] px-4 font-semibold text-white disabled:opacity-40">{pending?"Guardando...":"Preparar borrador sin descontar ganado"}</button>
  </section>}
  {draft&&<section className="rounded-3xl border border-[#d6dfd2] bg-[#f1f6ef] p-4 sm:p-6">
   <h2 className="text-lg font-bold">Borrador {draft.number}</h2>
   <p className="mt-2 text-sm">{draft.items.length} animales · {Number(draft.totalWeightKg).toLocaleString("es-VE")} kg · {(draft.totalCents/100).toLocaleString("es-VE")} {draft.currency}</p>
   <a href={"/api/livestock-sales/"+draft.id+"/receipt"} className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#29513a]"><FileDown className="size-4"/> Descargar comprobante PDF</a>
   <button disabled={pending} onClick={()=>void confirm()} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#275b3a] px-4 font-semibold text-white disabled:opacity-40"><CheckCircle2 className="size-5"/> Confirmar venta y descontar animales</button>
  </section>}
  <section className="space-y-3 rounded-3xl border bg-white p-4 sm:p-6">
   <h2 className="flex items-center gap-2 text-xl font-bold"><ScrollText className="size-5"/> Historial de ventas</h2>
   {sales.length===0?<p className="text-sm text-[#6b7c70]">Todavía no hay ventas registradas.</p>:sales.map(s=><article key={s.id} className="space-y-2 border-b py-4">
    <p className="font-bold">{s.number} · {s.status==="DRAFT"?"Borrador":"Confirmada"}</p>
    <p className="text-sm">{s.buyerName} · {s._count.items} animales · {Number(s.totalWeightKg).toLocaleString("es-VE")} kg</p>
    <a className="inline-flex items-center gap-2 text-sm font-semibold text-[#27593a]" href={"/api/livestock-sales/"+s.id+"/receipt"}><FileDown className="size-4"/> Comprobante interno PDF</a>
    {s.insaiPermitNumber?<p className="text-xs text-[#5b745f]">Soporte INSAI: {s.insaiPermitNumber} · <a className="font-bold underline" href={"/api/livestock-sales/"+s.id+"/insai/file"}>Descargar soporte</a></p>:canEdit?<div className="space-y-2 rounded-xl bg-[#f7faf6] p-3">
     <p className="text-xs text-[#647667]">Adjuntar permiso oficial INSAI (opcional, separado del comprobante interno).</p>
     <input className={input} placeholder="Número de la guía oficial" value={permitNo} onChange={e=>setPermitNo(e.target.value)} aria-label="Número de guía INSAI"/>
     <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={e=>setFile(e.target.files?.[0]||null)} aria-label="Archivo INSAI"/>
     <button disabled={pending||!file||!permitNo.trim()} onClick={()=>void uploadPermit(s.id)} className="min-h-10 rounded-xl border px-3 text-sm font-semibold disabled:opacity-40">Guardar soporte</button>
    </div>:<p className="text-xs text-[#647667]">INSAI pendiente</p>}
   </article>)}
  </section>
 </main>;
}
