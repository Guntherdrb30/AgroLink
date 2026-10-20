"use client";
import { useEffect, useRef, useState } from "react";
import { BrainCircuit, Download, MapPin, Plus, Save, Trash2, Undo2 } from "lucide-react";
import Link from "next/link";
import { validateGeoRing, exportGeoJsonFeature, type LngLat, type GeoRing } from "@/lib/geography/farm-geometry";

type Area = { id:string; name:string; kind:"BOUNDARY"|"FOUNDATION"|"PADDOCK"; geometry:{coordinates:[GeoRing]}; areaHectares:number; version:number };
type Props={farmId:string;farmName:string;lat:number|null;lon:number|null;canEdit:boolean};
const format=(n:number)=>new Intl.NumberFormat("es-VE",{maximumFractionDigits:3}).format(n);
export function FarmAreaEditor({farmId,farmName,lat,lon,canEdit}:Props){
 const [areas,setAreas]=useState<Area[]>([]);
 const [points,setPoints]=useState<GeoRing>([]);
 const [kind,setKind]=useState<"BOUNDARY"|"FOUNDATION"|"PADDOCK">("BOUNDARY");
 const [name,setName]=useState("Perímetro principal");
 const [selected,setSelected]=useState<Area|null>(null);
 const [editingVertex,setEditingVertex]=useState<number|null>(null);
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);
 const [loaded,setLoaded]=useState(false);
 const [view,setView]=useState({lon:lon??-67,lat:lat??8,zoom:11});
 const [mapReady,setMapReady]=useState(false);
 const mapDiv=useRef<HTMLDivElement>(null);
 const map=useRef<any>(null);
 const L=useRef<any>(null);
 const drawing=useRef<any>(null);
 const savedLayers=useRef<any>(null);
 const state=useRef({points,editingVertex,canEdit});
 state.current={points,editingVertex,canEdit};
 const endpoint="/api/farms/"+encodeURIComponent(farmId)+"/geo-areas";
 async function reload(){
   try{const r=await fetch(endpoint,{cache:"no-store"});if(!r.ok)throw Error("No se pudo consultar la finca");const j=await r.json();setAreas(j.areas);setLoaded(true);}
   catch(e){setMessage(e instanceof Error?e.message:"Error de conexión");}
 }
 useEffect(()=>{reload();},[farmId]);
 useEffect(()=>{
   if(!mapReady || !mapDiv.current || map.current)return;
   let live=true;
   (async()=>{
     if(!(window as any).L){
       const script=document.createElement("script");script.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
       script.integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
       script.crossOrigin="anonymous";
       document.head.appendChild(script);
       await new Promise<void>((resolve,reject)=>{script.onload=()=>resolve();script.onerror=()=>reject(Error("Error cargando el mapa"));});
     }
     if(!live||!mapDiv.current)return;
     const leaflet=(window as any).L;L.current=leaflet;
     const m=leaflet.map(mapDiv.current,{zoomControl:true,attributionControl:true}).setView([view.lat,view.lon],view.zoom);
     map.current=m;
     leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
       attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
       maxZoom:19
     }).addTo(m);
     savedLayers.current=leaflet.layerGroup().addTo(m);
     drawing.current=leaflet.layerGroup().addTo(m);
     m.on("click",(evt:any)=>{
       const x=state.current;if(!x.canEdit)return;
       const point:LngLat=[Number(evt.latlng.lng.toFixed(7)),Number(evt.latlng.lat.toFixed(7))];
       if(x.editingVertex!==null){setPoints(prev=>prev.map((p,i)=>i===x.editingVertex?point:p));setEditingVertex(null);}
       else setPoints(prev=>prev.length<300?[...prev,point]:prev);
     });
     setTimeout(()=>m.invalidateSize(),100);
   })().catch(()=>setMessage("No fue posible cargar la cartografía."));
   return()=>{live=false;map.current?.remove();map.current=null;};
 },[mapReady]);
 useEffect(()=>{
   if(!map.current||!L.current)return;
   const lib=L.current;const m=map.current;
   savedLayers.current.clearLayers();
   for(const a of areas){const positions=a.geometry.coordinates[0].map(([x,y])=>[y,x]);if(positions.length<3)continue;
    lib.polygon(positions,{color:a.kind==="BOUNDARY"?"#bd9b62":a.kind==="FOUNDATION"?"#c78a43":"#367c54",weight:3,fillOpacity:.13})
     .bindTooltip(a.name+" · "+format(a.areaHectares)+" ha").addTo(savedLayers.current);
   }
   drawing.current.clearLayers();
   points.forEach(([x,y],i)=>lib.circleMarker([y,x],{radius:editingVertex===i?9:6,color:"#795c31",fillColor:"#fff",fillOpacity:1,weight:3})
     .on("click",(e:any)=>{lib.DomEvent.stopPropagation(e);setEditingVertex(i);})
     .addTo(drawing.current));
   if(points.length>=2)lib.polyline(points.map(([x,y])=>[y,x]),{color:"#e2a94d",weight:3,dashArray:"7 5"}).addTo(drawing.current);
   if(points.length>=3)lib.polygon(points.map(([x,y])=>[y,x]),{color:"#e2a94d",weight:2,fillOpacity:.08}).addTo(drawing.current);
 },[areas,points,mapReady,editingVertex]);
 function choose(a:Area){
   setSelected(a);setKind(a.kind);setName(a.name);setPoints(a.geometry.coordinates[0].slice(0,-1));
   setEditingVertex(null);setMessage("");
   if(map.current){const ring=a.geometry.coordinates[0];map.current.fitBounds(ring.map(([x,y])=>[y,x]),{padding:[24,24]});}
 }
 function newArea(k:"BOUNDARY"|"FOUNDATION"|"PADDOCK"){
   setSelected(null);setKind(k);setName(k==="BOUNDARY"?"Perímetro principal":k==="FOUNDATION"?"Fundación nueva":"Potrero nuevo");
   setPoints([]);setEditingVertex(null);setMessage("");
 }
 async function save(){
   let polygon;
   try{polygon=validateGeoRing(points);}catch(e){setMessage(e instanceof Error?e.message:"Geometría inválida");return;}
   if(!name.trim()){setMessage("Escribe el nombre del área");return;}
   setBusy(true);setMessage("");
   try{const r=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
     id:selected?.id,version:selected?.version,kind,name:name.trim(),points:polygon.ring
   })});const j=await r.json();if(!r.ok)throw Error(j.error||"No se pudo guardar");
     setMessage("Área guardada correctamente.");setPoints([]);setSelected(null);await reload();
   }catch(e){setMessage(e instanceof Error?e.message:"Error al guardar");}finally{setBusy(false);}
 }
 async function remove(){
   if(!selected||!confirm("¿Eliminar esta área geográfica? Esta acción no afecta la finca ni sus animales."))return;
   setBusy(true);try{const r=await fetch(endpoint,{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:selected.id,version:selected.version})});const j=await r.json();if(!r.ok)throw Error(j.error);
   newArea("PADDOCK");await reload();setMessage("Área eliminada.");
   }catch(e){setMessage(e instanceof Error?e.message:"Error");}finally{setBusy(false);}
 }
 function download(){
   const features=areas.map(a=>({type:"Feature",properties:{name:a.name,kind:a.kind,areaHectares:a.areaHectares},geometry:a.geometry}));
   const file=new Blob([JSON.stringify({type:"FeatureCollection",features},null,2)],{type:"application/geo+json"});
   const u=URL.createObjectURL(file);const link=document.createElement("a");link.href=u;link.download="ganadia-finca-mapas.geojson";link.click();URL.revokeObjectURL(u);
 }
 let preview:string|null=null;try{if(points.length>=3)preview=format(validateGeoRing(points).areaHectares)+" ha";}catch{preview="Revisar geometría";}
 return <div className="space-y-5">
   <div className="flex flex-wrap items-center justify-between gap-3">
     <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#95713f]">GanadIA · GIS</p><h2 className="text-2xl font-bold text-[#1b3425]">Perímetro y potreros</h2><p className="mt-1 text-sm text-[#6c7a70]">Marca puntos en el mapa para delimitar áreas y calcular hectáreas.</p></div>
     {areas.length>0&&<button type="button" onClick={download} className="inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-bold"><Download className="size-4"/> Exportar GeoJSON</button>}
   </div>
   <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossOrigin="anonymous"/>
   <Link href={"/farms/"+encodeURIComponent(farmId)+"/geografia/asesor"} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#1d3b2b] px-4 text-sm font-bold text-white shadow-sm hover:bg-[#2a5137] sm:w-auto"><BrainCircuit className="size-5"/> Asesor inteligente de fundaciones y potreros</Link>
   <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
     <div className="overflow-hidden rounded-3xl border bg-white">
       {!mapReady?<div className="flex min-h-[360px] flex-col items-center justify-center bg-[#e7eee3] p-6 text-center">
         <MapPin className="size-10 text-[#496c50]"/><p className="mt-4 font-bold">Mapa interactivo de la finca</p>
         <p className="mt-2 max-w-sm text-sm text-[#5d7761]">La cartografía se carga cuando lo solicitas y comparte las coordenadas visibles con OpenStreetMap.</p>
         <button type="button" onClick={()=>setMapReady(true)} className="mt-5 rounded-full bg-[#244a32] px-5 py-3 font-bold text-white">Activar mapa</button>
       </div>:<div ref={mapDiv} className="h-[380px] w-full sm:h-[520px]" aria-label="Mapa interactivo de perímetro y potreros"/>}
       <p className="px-4 py-3 text-xs leading-5 text-[#6a7a6d]">Toque el mapa para agregar vértices. Para mover un punto, selecciónelo y toque su nueva ubicación. Las áreas dibujadas son estimaciones operativas, no límites catastrales certificados.</p>
     </div>
     <section className="space-y-4 rounded-3xl border bg-white p-4 sm:p-5">
       <h3 className="text-lg font-bold text-[#1f382a]">Gestionar áreas</h3>
       {canEdit&&<div className="grid grid-cols-3 gap-2">
         <button onClick={()=>newArea("BOUNDARY")} type="button" className="rounded-xl bg-[#f1ebdf] px-3 py-3 text-xs font-bold text-[#745a30]"><Plus className="mr-1 inline size-4"/> Perímetro</button>
         <button onClick={()=>newArea("FOUNDATION")} type="button" className="rounded-xl bg-[#f8f0df] px-2 py-3 text-xs font-bold text-[#826335]"><Plus className="mr-1 inline size-4"/> Fundación</button>
         <button onClick={()=>newArea("PADDOCK")} type="button" className="rounded-xl bg-[#e9f3e7] px-3 py-3 text-xs font-bold text-[#35643e]"><Plus className="mr-1 inline size-4"/> Potrero</button>
       </div>}
       {canEdit&&<><label className="block text-xs font-semibold">Nombre del área<input value={name} onChange={e=>setName(e.target.value)} maxLength={80} className="mt-2 h-11 w-full rounded-xl border px-3 text-base"/></label>
       <p className="text-xs text-[#6b7e70]">{points.length} puntos marcados · Superficie: <strong>{preview??"Pendiente"}</strong></p>
       <div className="flex flex-wrap gap-2">
        <button onClick={()=>setPoints(p=>p.slice(0,-1))} disabled={!points.length||busy} type="button" className="inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold"><Undo2 className="size-4"/> Deshacer</button>
        <button onClick={()=>setPoints([])} disabled={!points.length||busy} type="button" className="rounded-xl border px-3 py-2 text-xs font-bold">Limpiar</button>
       </div>
       <button type="button" onClick={save} disabled={busy||points.length<3} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#795d31] px-4 font-bold text-white disabled:opacity-50"><Save className="size-4"/>{busy?"Guardando...":selected?"Guardar cambios":"Guardar área"}</button>
       {selected&&<button onClick={remove} type="button" disabled={busy} className="inline-flex min-h-10 items-center gap-2 text-xs font-bold text-red-700"><Trash2 className="size-4"/> Eliminar área</button>}
       </>}
       {message&&<p role="status" className="rounded-xl bg-[#f5f4ed] px-3 py-2 text-xs leading-5">{message}</p>}
       <div className="border-t pt-4"><h4 className="text-sm font-bold">Áreas guardadas</h4>
         {!loaded?<p className="mt-2 text-xs">Cargando...</p>:areas.length===0?<p className="mt-2 text-xs text-[#718074]">Todavía no has definido áreas.</p>:<div className="mt-3 space-y-2">
           {areas.map(a=><button type="button" key={a.id} onClick={()=>choose(a)} className="flex w-full items-center justify-between gap-2 rounded-xl border p-3 text-left hover:bg-[#f5f7f3]"><span className="min-w-0"><strong className="block truncate text-sm">{a.name}</strong><span className="text-xs text-[#67766c]">{a.kind==="BOUNDARY"?"Perímetro":a.kind==="FOUNDATION"?"Fundación":"Potrero"}</span></span><span className="shrink-0 text-xs font-bold">{format(a.areaHectares)} ha</span></button>)}
         </div>}
       </div>
     </section>
   </div>
   <p className="text-xs leading-5 text-[#6a7d6c]">El área se calcula sobre la superficie terrestre a partir de las coordenadas GPS. Para documentos legales de propiedad debe usarse levantamiento profesional.</p>
 </div>;
}
