"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, ArrowLeft, ArrowRight, BrainCircuit, CheckCheck,
  ClipboardList, Plus, Save, ShieldAlert, Trash2, Trees,
} from "lucide-react";
import {
  calculateGrazingPlan, type FoundationPlanInput, type GrazingHerd,
  type GrazingPlanInput, type CattleClass,
  type GrazingSeason, type ProductionPurpose,
} from "@/lib/planning/grazing-foundations";
import { GrazingSketchMap } from "@/components/geography/grazing-sketch-map";
import { type GeoRing } from "@/lib/geography/farm-geometry";
import { type LocationPoint } from "@/lib/geography/paddock-sketch";

type Geometry = { id: string; name: string; hectares: number; ring: GeoRing };
type Props = {
  farmId: string;
  farmName: string;
  farmHectares: number | null;
  latitude: number | null;
  longitude: number | null;
  animalsRegistered: number;
  geometries: Geometry[];
  canSave: boolean;
};
type Saved = { id: string; title: string; createdAt: string; output: unknown };

const kinds: { value: CattleClass; label: string }[] = [
  { value: "NOVILLOS", label: "Novillos" }, { value: "MAUTES", label: "Mautes" },
  { value: "VACAS", label: "Vacas" }, { value: "VACAS_LECHE", label: "Vacas lecheras" },
  { value: "BECERROS", label: "Becerros" }, { value: "TOROS", label: "Toros" },
  { value: "MIXTO", label: "Grupo mixto" },
];
const purposes: {value:ProductionPurpose;label:string}[] = [
  {value:"CEBA",label:"Engorde o ceba"}, {value:"CRIA",label:"Cría"},
  {value:"LECHE",label:"Leche"}, {value:"DOBLE_PROPOSITO",label:"Doble propósito"},
];
const seasons: {value:GrazingSeason;label:string}[] = [
  {value:"VERANO",label:"Verano"}, {value:"INVIERNO",label:"Invierno"},
  {value:"TRANSICION",label:"Transición"},
];
const formatter=new Intl.NumberFormat("es-VE",{maximumFractionDigits:2});
const display=(value:number)=>formatter.format(value);
const inputClass="min-h-11 w-full min-w-0 rounded-xl border border-[#d8e2d8] bg-white px-3 text-base font-semibold text-[#2c4833] outline-none focus-visible:ring-2 focus-visible:ring-[#9e7a45]/30";
function createHerd(index:number):GrazingHerd {
  return {id:"g"+index,category:"NOVILLOS",headcount:0,averageWeightKg:0,
    intakePercent:2.5,restDays:30,occupationDays:3};
}
function createFoundation(index:number,geometry?:Geometry):FoundationPlanInput {
  return {
    id:"f"+index,geoAreaId:geometry?.id??null,
    name:geometry?.name??"Fundación "+index,
    hectares:geometry?.hectares??0,
    availablePercent:80,season:"TRANSICION",forageKgDmHa:null,
    usePercent:50,waterPoints:0,corralKnown:false,houseKnown:false,floodRisk:false,
    purpose:"CEBA",herds:[createHerd(1)],facilities:[],
  };
}
const initial=(farmName:string,geometries:Geometry[]):GrazingPlanInput=>({
  title:"Estudio de distribución — "+farmName,
  assumptionsSource:"DECLARED",
  foundations:geometries.length
    ?geometries.slice(0,12).map((g,i)=>createFoundation(i+1,g))
    :[createFoundation(1)],
});
const steps=["Fundaciones","Ganado","Terreno e instalaciones","Estudio"];
function NumberField({label,value,onChange,min=0,max,step="any",hint}:{
 label:string;value:number;onChange:(value:number)=>void;
 min?:number;max?:number;step?:string;hint?:string;
}) {
 return <label className="block min-w-0 space-y-1.5">
   <span className="block text-xs font-bold leading-5 text-[#4d6652]">{label}</span>
   <input className={inputClass} type="number" inputMode="decimal"
     min={min} max={max} step={step} value={value}
     onChange={e=>onChange(Number(e.target.value))}/>
   {hint&&<span className="block text-[11px] leading-5 text-[#718377]">{hint}</span>}
 </label>;
}

export function GrazingAdvisor({farmId,farmName,farmHectares,latitude,longitude,animalsRegistered,geometries,canSave}:Props) {
  const [step,setStep]=useState(0);
  const [selected,setSelected]=useState(0);
  const [plan,setPlan]=useState<GrazingPlanInput>(()=>initial(farmName,geometries));
  const [notice,setNotice]=useState("");
  const [saving,setSaving]=useState(false);
  const [savedId,setSavedId]=useState<string|null>(null);
  const [history,setHistory]=useState<Saved[]>([]);
  const foundation=plan.foundations[selected]??plan.foundations[0];
  const linked=foundation?.geoAreaId
    ?geometries.find(g=>g.id===foundation.geoAreaId)??null:null;
  const sumHeads=plan.foundations.reduce((sum,f)=>sum+f.herds.reduce((s,g)=>s+Math.max(0,g.headcount),0),0);
  const result=useMemo(()=>{
    try{return {value:calculateGrazingPlan(plan),error:""};}
    catch(e){return {value:null,error:e instanceof Error?e.message:"Completa los datos del estudio"};}
  },[plan]);
  const selectedResult=result.value?.foundations[selected]??null;
  const endpoint="/api/farms/"+encodeURIComponent(farmId)+"/grazing-plans";

  useEffect(()=>{
    let active=true;
    fetch(endpoint,{cache:"no-store"}).then(r=>r.ok?r.json():{plans:[]}).then(d=>{if(active)setHistory(d.plans??[])}).catch(()=>{});
    return()=>{active=false};
  },[endpoint]);

  function changeFoundation(index:number,patch:Partial<FoundationPlanInput>) {
    setSavedId(null);
    setPlan(old=>({...old,foundations:old.foundations.map((f,i)=>i===index?{...f,...patch}:f)}));
  }
  function changeHerd(index:number,patch:Partial<GrazingHerd>) {
    changeFoundation(selected,{herds:foundation.herds.map((h,i)=>i===index?{...h,...patch}:h)});
  }
  function changeCount(raw:number){
    const n=Math.min(12,Math.max(1,Math.floor(raw||1)));
    setSelected(v=>Math.min(v,n-1));
    setSavedId(null);
    setPlan(old=>({...old,foundations:Array.from({length:n},(_,i)=>old.foundations[i]??createFoundation(i+1,geometries[i]))}));
  }
  function changeGeometry(index:number,id:string){
    const chosen=geometries.find(g=>g.id===id);
    changeFoundation(index,{geoAreaId:chosen?.id??null,
      hectares:chosen?.hectares??plan.foundations[index].hectares,
      name:chosen?.name??plan.foundations[index].name});
  }
  function addHerd(){
    if(foundation.herds.length>=15){setNotice("Máximo 15 grupos por fundación.");return;}
    changeFoundation(selected,{herds:[...foundation.herds,createHerd(foundation.herds.length+1)]});
  }
  function placeFacility(kind:LocationPoint["kind"],lat:number,lng:number){
    const current=foundation.facilities??[];
    const waterCount=kind==="WATER"?foundation.waterPoints+1:foundation.waterPoints;
    changeFoundation(selected,{
      facilities:[...current,{kind,lat,lng}],
      waterPoints:waterCount,
      ...(kind==="CORRAL"?{corralKnown:true}:{}),
      ...(kind==="HOUSE"?{houseKnown:true}:{}),
    });
    setNotice("Se marcó la instalación sobre el mapa. Revisa el resultado antes de guardar el estudio.");
  }
  function removeFacility(index:number){
    const current=foundation.facilities??[];
    const entry=current[index];
    changeFoundation(selected,{
      facilities:current.filter((_,i)=>i!==index),
      waterPoints:entry?.kind==="WATER"?Math.max(0,foundation.waterPoints-1):foundation.waterPoints,
    });
  }
  function next(){
    setNotice("");
    if(step===0&&plan.foundations.some(f=>f.name.trim().length<2||f.hectares<=0)){
      setNotice("Todas las fundaciones necesitan nombre y superficie mayor que cero.");return;
    }
    if(step===1&&plan.foundations.some(f=>f.herds.some(h=>h.headcount<=0||h.averageWeightKg<=0))){
      setNotice("Indica cantidad de animales y peso promedio de cada grupo de cada fundación.");return;
    }
    setStep(Math.min(3,step+1));
  }
  async function savePlan(){
    if(!result.value){setNotice(result.error);return;}
    setSaving(true);setNotice("");
    try{
      const res=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(plan)});
      const data=await res.json();
      if(!res.ok)throw new Error(data.error??"No se pudo guardar el estudio");
      setSavedId(data.id);
      setNotice("Estudio guardado. Los datos son una propuesta técnica preliminar, no una autorización de ejecución.");
      const newer=await fetch(endpoint,{cache:"no-store"});
      if(newer.ok)setHistory((await newer.json()).plans??[]);
    }catch(e){setNotice(e instanceof Error?e.message:"Error de conexión");}
    finally{setSaving(false);}
  }
  return <div className="mx-auto max-w-6xl space-y-5 pb-8">
    <Link href={"/farms/"+encodeURIComponent(farmId)+"/geografia"}
      className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#86663a]">
      <ArrowLeft className="size-4"/> Volver a Mapa y GPS
    </Link>
    <header className="rounded-[26px] bg-[linear-gradient(125deg,#173126,#3d5333)] p-5 text-white shadow-md sm:p-8">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#d9c093]">
        <BrainCircuit className="size-5"/> GanadIA · Asesor de potreros
      </div>
      <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-4xl">Diseñar el pastoreo de tu hato</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-white/85">
        El estudio considera las fundaciones, animales, producción de pasto, verano e invierno,
        agua, casa y corrales. Primero calculamos capacidades; después revisamos un bosquejo sobre el mapa.
      </p>
      <p className="mt-4 text-xs text-[#efe2c9]">Finca: <strong>{farmName}</strong> · {farmHectares!==null?display(farmHectares)+" ha declaradas":"Superficie total pendiente"}
        {" · "}{animalsRegistered} animales actualmente registrados en GanadIA.</p>
    </header>
    <div className="grid grid-cols-4 gap-1.5">
      {steps.map((title,i)=><button key={title} type="button"
        onClick={()=>{if(i<=step){setStep(i);setNotice("");}}}
        aria-current={i===step?"step":undefined}
        className={"min-h-14 rounded-xl px-1 py-2 text-[10px] font-bold leading-4 sm:text-sm "+
          (i===step?"bg-[#214a32] text-white":i<step?"bg-[#e5eee3] text-[#375d43]":"bg-[#f0f2ed] text-[#8c998c]")}>
        {i+1}. {title}
      </button>)}
    </div>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <section className="min-w-0 space-y-5 rounded-[24px] border border-[#dfe8de] bg-white p-4 shadow-sm sm:p-6">
        <div className="flex items-center gap-2"><BrainCircuit className="size-6 text-[#9d7b43]"/><h2 className="text-lg font-bold text-[#233d2a]">{steps[step]}</h2></div>
        {step===0&&<div className="space-y-5">
          <p className="text-sm leading-6 text-[#64786a]">¿Cuántas fundaciones tiene tu finca? Pueden estar en sitios diferentes o cumplir funciones distintas.</p>
          <NumberField label="Cantidad de fundaciones" value={plan.foundations.length}
            onChange={changeCount} min={1} max={12} step="1"/>
          {geometries.length>0&&<p className="rounded-xl bg-[#e9f2e8] p-3 text-xs leading-5 text-[#386c45]">Detectamos {geometries.length} fundaciones dibujadas en el mapa. Puedes vincularlas a este estudio.</p>}
          <label className="block text-xs font-bold text-[#4d6652]">Nombre del estudio
            <input className={inputClass+" mt-2"} value={plan.title} maxLength={100}
              onChange={e=>setPlan(old=>({...old,title:e.target.value}))}/>
          </label>
          {plan.foundations.map((f,i)=><div key={f.id} className="space-y-3 rounded-2xl border border-[#e0e9df] bg-[#fafbf8] p-4">
            <h3 className="font-bold text-[#2d5135]">Fundación {i+1}</h3>
            {geometries.length>0&&<label className="block text-xs font-semibold text-[#566c58]">Vincular perímetro del mapa
              <select className={inputClass+" mt-2"} value={f.geoAreaId??""} onChange={e=>changeGeometry(i,e.target.value)}>
                <option value="">Sin polígono geográfico</option>
                {geometries.map(g=><option key={g.id} value={g.id}>{g.name} ({display(g.hectares)} ha)</option>)}
              </select>
            </label>}
            <label className="block text-xs font-semibold text-[#566c58]">Nombre
              <input className={inputClass+" mt-2"} value={f.name} maxLength={100}
                onChange={e=>changeFoundation(i,{name:e.target.value})}/>
            </label>
            <NumberField label="Superficie de esta fundación (ha)" value={f.hectares}
              onChange={hectares=>changeFoundation(i,{hectares})} min={0.01} max={3000000} hint={f.geoAreaId?"La medición del polígono del mapa prevalecerá al guardar.":"Si todavía no dibujaste esta fundación, indica la superficie declarada."}/>
          </div>)}
          <p className="text-xs leading-5 text-[#718075]">Las fundaciones pueden incluir potreros, corrales, casa, almacenes, caminos y reservas. No asumimos que toda el área sirve para pastoreo.</p>
        </div>}
        {step>=1&&step<=2&&<div className="flex gap-2 overflow-x-auto pb-2">
          {plan.foundations.map((f,i)=><button key={f.id} type="button"
            onClick={()=>{setSelected(i);setNotice("");}}
            className={"shrink-0 rounded-full px-4 py-2 text-xs font-bold "+
              (selected===i?"bg-[#214b32] text-white":"border bg-[#f7f8f4] text-[#526b58]")}>{f.name}</button>)}
        </div>}
        {step===1&&<div className="space-y-5">
          <p className="text-sm leading-6 text-[#627568]">Indica el ganado que maneja cada fundación. Separa los grupos cuando tengan objetivos, pesos o rotaciones diferentes.</p>
          <label className="block text-xs font-semibold">Propósito de {foundation.name}
            <select className={inputClass+" mt-2"} value={foundation.purpose}
              onChange={e=>changeFoundation(selected,{purpose:e.target.value as ProductionPurpose})}>
              {purposes.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </label>
          {foundation.herds.map((g,i)=><div key={g.id} className="space-y-3 rounded-2xl border border-[#e0e9df] bg-[#fafbf8] p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#25452e]">Grupo {i+1}</h3>
              {foundation.herds.length>1&&<button onClick={()=>changeFoundation(selected,{herds:foundation.herds.filter((_,j)=>j!==i)})} type="button" className="text-xs font-semibold text-red-700"><Trash2 className="inline size-4"/> Quitar</button>}
            </div>
            <label className="block text-xs font-semibold">Tipo de ganado
              <select className={inputClass+" mt-2"} value={g.category} onChange={e=>changeHerd(i,{category:e.target.value as CattleClass})}>
                {kinds.map(k=><option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Número de animales" value={g.headcount} onChange={headcount=>changeHerd(i,{headcount})} min={1} step="1"/>
              <NumberField label="Peso medio (kg)" value={g.averageWeightKg} onChange={averageWeightKg=>changeHerd(i,{averageWeightKg})} min={15}/>
              <NumberField label="Consumo MS (% peso/día)" value={g.intakePercent} onChange={intakePercent=>changeHerd(i,{intakePercent})} min={.5} max={5} step="0.1"/>
              <NumberField label="Descanso del pasto (días)" value={g.restDays} onChange={restDays=>changeHerd(i,{restDays})} min={1} max={180} step="1"/>
              <NumberField label="Ocupación de potrero (días)" value={g.occupationDays} onChange={occupationDays=>changeHerd(i,{occupationDays})} min={1} max={30} step="1"/>
            </div>
          </div>)}
          <button type="button" onClick={addHerd} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#ecf3e9] px-5 text-sm font-bold text-[#2c6540]"><Plus className="size-4"/> Otro grupo de ganado</button>
          <p className="text-xs leading-6 text-[#79867b]">Los valores de consumo y descanso son supuestos editables, no mediciones del terreno ni una recomendación veterinaria individual.</p>
        </div>}
        {step===2&&<div className="space-y-5">
          <p className="text-sm leading-6 text-[#667869]">Conozcamos las condiciones reales de {foundation.name}. Sin el aforo de pasto no calcularemos la capacidad definitiva.</p>
          <label className="block text-xs font-bold">Temporada de planificación
            <select className={inputClass+" mt-2"} value={foundation.season}
              onChange={e=>changeFoundation(selected,{season:e.target.value as GrazingSeason})}>
              {seasons.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Área utilizable (%)" value={foundation.availablePercent} onChange={availablePercent=>changeFoundation(selected,{availablePercent})} min={1} max={100}/>
            <NumberField label="Forraje aprovechable (%)" value={foundation.usePercent} onChange={usePercent=>changeFoundation(selected,{usePercent})} min={1} max={100}/>
            <label className="block min-w-0 space-y-1.5">
              <span className="block text-xs font-bold leading-5 text-[#4d6652]">Aforo disponible (kg MS/ha)</span>
              <input className={inputClass} type="number" inputMode="decimal" min={1} max={100000}
                placeholder="Sin medición" value={foundation.forageKgDmHa??""}
                onChange={e=>changeFoundation(selected,{forageKgDmHa:e.target.value===""?null:Number(e.target.value)})}/>
              <span className="block text-[11px] leading-5 text-[#718377]">Usa una medición local del forraje o marca el dato como supuesto.</span>
            </label>
            <NumberField label="Puntos de agua" value={foundation.waterPoints}
              onChange={waterPoints=>changeFoundation(selected,{waterPoints})} min={0} max={1000} step="1"/>
          </div>
          <label className="flex min-h-12 items-center gap-3 rounded-xl border p-3 text-xs font-semibold">
            <input type="checkbox" checked={foundation.corralKnown} onChange={e=>changeFoundation(selected,{corralKnown:e.target.checked})}/> Conozco la ubicación del corral de trabajo
          </label>
          <label className="flex min-h-12 items-center gap-3 rounded-xl border p-3 text-xs font-semibold">
            <input type="checkbox" checked={foundation.houseKnown} onChange={e=>changeFoundation(selected,{houseKnown:e.target.checked})}/> Conozco la ubicación de la casa
          </label>
          <label className="flex min-h-12 items-center gap-3 rounded-xl border p-3 text-xs font-semibold">
            <input type="checkbox" checked={foundation.floodRisk} onChange={e=>changeFoundation(selected,{floodRisk:e.target.checked})}/> Hay zonas que se inundan durante el invierno
          </label>
          <label className="block text-xs font-bold">Origen de los datos de forraje
            <select className={inputClass+" mt-2"} value={plan.assumptionsSource}
              onChange={e=>setPlan(old=>({...old,assumptionsSource:e.target.value as GrazingPlanInput["assumptionsSource"]}))}>
              <option value="DECLARED">Estimaciones del productor</option>
              <option value="MEASURED">Mediciones de campo</option>
            </select>
          </label>
          <GrazingSketchMap
            geometry={linked?{ring:linked.ring,name:linked.name}:null}
            latitude={latitude} longitude={longitude}
            paddocks={0} facilities={foundation.facilities??[]} onAddFacility={placeFacility}
          />
          {!!foundation.facilities?.length&&<div className="space-y-2 rounded-xl border p-3">
            <p className="text-xs font-bold">Instalaciones marcadas</p>
            {foundation.facilities.map((v,i)=><div key={i} className="flex items-center justify-between gap-2 text-xs">
              <span>{v.kind==="CORRAL"?"Corral":v.kind==="HOUSE"?"Casa":v.kind==="WATER"?"Agua":"Acceso"} — {v.lat.toFixed(5)}, {v.lng.toFixed(5)}</span>
              <button type="button" onClick={()=>removeFacility(i)} className="text-red-700"><Trash2 className="size-4"/></button>
            </div>)}
          </div>}
        </div>}
        {step===3&&<div className="space-y-5">
          {result.value ? <>
            <div className="rounded-2xl bg-[#eaf1e8] p-4">
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#467349]">Estudio calculado</p>
              <h3 className="mt-2 text-2xl font-bold text-[#22412d]">{result.value.totals.paddocks} potreros orientativos</h3>
              <p className="mt-1 text-sm text-[#617867]">{result.value.totals.foundations} fundaciones · {display(result.value.totals.animals)} animales · {display(result.value.totals.availableAreaHa)} ha utilizables declaradas</p>
              <p className="mt-2 text-xs leading-5 text-[#527357]">Consumo estimado: {display(result.value.totals.dailyDryMatterKg)} kg de materia seca/día.</p>
              <p className="mt-1 text-xs leading-5 text-[#527357]">{result.value.totals.requiredAreaHa===null?"Sin aforo completo no se puede estimar el área necesaria.":"Área estimada necesaria: "+display(result.value.totals.requiredAreaHa)+" ha."}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {plan.foundations.map((f,i)=><button key={f.id} type="button" onClick={()=>setSelected(i)}
                className={"rounded-full px-3 py-2 text-xs font-bold "+(selected===i?"bg-[#214b32] text-white":"bg-[#f1f3ee] text-[#516e55]")}>
                {f.name}
              </button>)}
            </div>
            {selectedResult&&<article className="space-y-3 rounded-2xl border border-[#dce8dc] p-4">
              <h3 className="text-lg font-bold text-[#27452f]">{selectedResult.name}</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Ganado",display(selectedResult.heads)+" animales"],
                  ["Potreros",display(selectedResult.paddocks)],
                  ["Área utilizable",display(selectedResult.availableAreaHa)+" ha"],
                  ["Demanda MS",display(selectedResult.dailyDryMatterKg)+" kg/día"],
                ].map(([label,v])=><div key={label} className="rounded-xl bg-[#f6f8f4] p-3"><p className="text-xs text-[#718475]">{label}</p><p className="mt-1 text-base font-bold text-[#29482e]">{v}</p></div>)}
              </div>
              {selectedResult.grazingAreaRequiredHa===null?
                <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900"><AlertTriangle className="mr-1 inline size-4"/> Capacidad de carga no verificable sin aforo de forraje.</p>:
                <p className={"rounded-xl p-3 text-xs font-semibold "+(selectedResult.areaAdequacy==="PRELIMINAR_DEFICIT"?"bg-red-50 text-red-900":"bg-green-50 text-green-800")}>
                  {selectedResult.areaAdequacy==="PRELIMINAR_DEFICIT"?"Área insuficiente con los supuestos declarados.":"Superficie preliminarmente suficiente según supuestos."}
                  {" · "}Necesaria: {display(selectedResult.grazingAreaRequiredHa)} ha.
                </p>}
              {selectedResult.herds.map((h,i)=><div key={i} className="rounded-xl bg-[#f9faf7] p-3 text-xs leading-6 text-[#536959]">
                <strong>{h.category}</strong>: {h.headcount} cabezas · {h.paddocks} potreros · Descanso {h.restDays} días / ocupación {h.occupationDays} días.
                {h.estimatedAreaPerPaddockHa!==null&&<span> · {display(h.estimatedAreaPerPaddockHa)} ha por potrero estimado</span>}
              </div>)}
              {!!selectedResult.warnings.length&&<div className="space-y-2">
                <p className="flex items-center gap-1.5 text-xs font-bold text-amber-800"><ShieldAlert className="size-4"/> Observaciones de seguridad y manejo</p>
                {selectedResult.warnings.map((w,i)=><p key={i} className="rounded-lg bg-amber-50 p-2 text-xs leading-5 text-amber-900">{w}</p>)}
              </div>}
            </article>}
            <GrazingSketchMap
              geometry={linked?{ring:linked.ring,name:linked.name}:null}
              latitude={latitude} longitude={longitude} facilities={foundation.facilities??[]}
              paddocks={selectedResult?.paddocks??0} onAddFacility={canSave?placeFacility:undefined}
            />
            <div className="rounded-xl border border-[#e4e9df] p-4">
              <p className="text-sm font-bold">Limitaciones</p>
              {result.value.limitations.map((x,i)=><p key={i} className="mt-2 text-xs leading-5 text-[#718075]">• {x}</p>)}
              {farmHectares!==null&&plan.foundations.reduce((a,f)=>a+f.hectares,0)>farmHectares*1.03&&
                <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">Las hectáreas por fundación superan la superficie total declarada de la finca.</p>}
            </div>
            {canSave&&<button disabled={saving} type="button" onClick={savePlan}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#795d31] px-5 font-bold text-white disabled:opacity-60">
              <Save className="size-4"/>{saving?"Guardando el estudio...":"Guardar estudio preliminar"}
            </button>}
            {savedId&&<p className="flex items-center gap-2 rounded-xl bg-green-50 p-3 text-sm font-semibold text-green-800"><CheckCheck className="size-5"/> Estudio registrado en GanadIA.</p>}
          </>:<div role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{result.error}</div>}
        </div>}
        {notice&&<p role="status" className="rounded-xl border border-[#e8e2d3] bg-[#fffaf0] p-3 text-sm leading-6 text-[#835f27]">{notice}</p>}
        <div className="flex items-center justify-between gap-3 border-t pt-4">
          <button type="button" disabled={step===0} onClick={()=>{setStep(v=>Math.max(0,v-1));setNotice("");}}
            className="min-h-11 rounded-full border border-[#dbe4d9] px-4 text-sm font-bold text-[#637565] disabled:opacity-30">Anterior</button>
          {step<3&&<button type="button" onClick={next}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#795d31] px-5 text-sm font-bold text-white">Continuar <ArrowRight className="size-4"/></button>}
        </div>
      </section>
      <aside className="space-y-4">
        <div className="rounded-[22px] border border-[#e0e8dd] bg-white p-5">
          <h3 className="flex items-center gap-2 font-bold text-[#294532]"><ClipboardList className="size-5 text-[#97723c]"/> Estado del análisis</h3>
          <p className="mt-3 text-sm text-[#6a7c6c]">Fundaciones incluidas: <strong>{plan.foundations.length}</strong></p>
          <p className="mt-1 text-sm text-[#6a7c6c]">Ganado declarado: <strong>{display(sumHeads)}</strong></p>
          <p className="mt-1 text-sm text-[#6a7c6c]">Registrado en la finca: <strong>{display(animalsRegistered)}</strong></p>
          <p className="mt-3 text-xs leading-6 text-[#718075]">Las cifras declaradas para simular no modifican el inventario real de ganado.</p>
        </div>
        <div className="rounded-[22px] border border-[#e0e8dd] bg-white p-5">
          <h3 className="flex items-center gap-2 font-bold text-[#294532]"><Trees className="size-5 text-[#99743c]"/> Estudio venezolano</h3>
          <p className="mt-3 text-xs leading-6 text-[#708172]">Considera diferencias entre fundaciones, sabanas, verano e invierno, corrales, viviendas, agua y potreros. Las unidades productivas pueden funcionar en distintos sectores de un mismo hato.</p>
          <p className="mt-3 text-xs leading-6 text-[#708172]">Esta primera versión es una entrevista guiada con cálculos verificables. No usa aún un modelo generativo ni cobra tokens de IA.</p>
        </div>
        {!!history.length&&<div className="rounded-[22px] border border-[#e0e8dd] bg-white p-5">
          <h3 className="text-sm font-bold text-[#294532]">Estudios anteriores</h3>
          {history.slice(0,6).map(p=><div key={p.id} className="mt-3 border-t pt-3">
            <p className="truncate text-xs font-bold">{p.title}</p>
            <p className="mt-1 text-xs text-[#829087]">{new Date(p.createdAt).toLocaleDateString("es-VE")}</p>
          </div>)}
        </div>}
      </aside>
    </div>
  </div>;
}
