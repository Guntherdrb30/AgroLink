import { polygonAreaHectares, validateGeoRing, type GeoRing, type LngLat } from "@/lib/geography/farm-geometry";

type Axis = "longitude" | "latitude";
export type LocationPoint = { kind: "HOUSE" | "CORRAL" | "WATER" | "ACCESS"; lat: number; lng: number; label?: string };
export type SketchZone = { name: string; ring: GeoRing; areaHectares: number; index: number };
export type PaddockSketch = {
  zones: SketchZone[];
  axis: Axis;
  totalFenceMetersEstimate: number;
  caution: string[];
};

function convex(ring: GeoRing): boolean {
  let sign = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length], c = ring[(i + 2) % ring.length];
    const v = (b[0]-a[0])*(c[1]-b[1]) - (b[1]-a[1])*(c[0]-b[0]);
    if (Math.abs(v) < 1e-10) continue;
    if (sign === 0) sign = Math.sign(v);
    else if (Math.sign(v) !== sign) return false;
  }
  return sign !== 0;
}
const key = (axis:Axis):0|1=>axis==="longitude"?0:1;
function clipHalf(ring: GeoRing, axis: Axis, threshold: number, less: boolean): GeoRing {
  const idx = key(axis);
  const inside = (p:LngLat) => less ? p[idx] <= threshold + 1e-12 : p[idx] >= threshold - 1e-12;
  const result: GeoRing = [];
  for (let i=0;i<ring.length;i++) {
    const a=ring[i], b=ring[(i+1)%ring.length];
    const aIn=inside(a), bIn=inside(b);
    if (aIn) result.push([...a] as LngLat);
    if (aIn!==bIn) {
      const denom=b[idx]-a[idx];
      if (Math.abs(denom)>1e-14) {
        const t=Math.max(0,Math.min(1,(threshold-a[idx])/denom));
        const hit:LngLat=[a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])];
        result.push(hit);
      }
    }
  }
  const clean:GeoRing=[];
  for (const p of result) {
    const q:[number,number]=[Number(p[0].toFixed(7)),Number(p[1].toFixed(7))];
    const prev=clean[clean.length-1];
    if (!prev||(prev[0]-q[0])**2+(prev[1]-q[1])**2>1e-14)clean.push(q);
  }
  if (clean.length>2&&(clean[0][0]-clean.at(-1)![0])**2+(clean[0][1]-clean.at(-1)![1])**2<1e-14)clean.pop();
  return clean;
}
function strip(ring:GeoRing,axis:Axis,low:number,high:number){
  return clipHalf(clipHalf(ring,axis,low,false),axis,high,true);
}
function approximateFenceLength(ring:GeoRing,axis:Axis,cut:number):number {
  const idx=key(axis);const ix=idx===0?1:0;
  const hits:number[]=[];
  for(let i=0;i<ring.length;i++){
    const a=ring[i],b=ring[(i+1)%ring.length];
    if((a[idx]-cut)*(b[idx]-cut)>0||Math.abs(b[idx]-a[idx])<1e-12)continue;
    const t=(cut-a[idx])/(b[idx]-a[idx]);
    if(t>=0&&t<=1)hits.push(a[ix]+t*(b[ix]-a[ix]));
  }
  if(hits.length<2)return 0;
  const meanLat=ring.reduce((s,p)=>s+p[1],0)/ring.length;
  const meters=ix===0?111320*Math.cos(meanLat*Math.PI/180):111320;
  return (Math.max(...hits)-Math.min(...hits))*meters;
}
function candidate(ring:GeoRing, count:number, axis:Axis, points:LocationPoint[]):PaddockSketch|null {
  const idx=key(axis);
  const bounds=ring.map(p=>p[idx]),min=Math.min(...bounds),max=Math.max(...bounds);
  const total=polygonAreaHectares(ring),cuts:number[]=[];
  if(max-min<1e-9||total<=0)return null;
  for(let i=1;i<count;i++){
    let low=min, high=max;
    const desired=total*i/count;
    for(let iteration=0;iteration<38;iteration++){
      const middle=(low+high)/2;
      const clipped=clipHalf(ring,axis,middle,true);
      const area=clipped.length<3?0:polygonAreaHectares(clipped);
      if(area<desired)low=middle;else high=middle;
    }
    cuts.push((low+high)/2);
  }
  const sections:SketchZone[]=[];
  for(let i=0;i<count;i++){
    const section=strip(ring,axis,i===0?min:cuts[i-1],i===count-1?max:cuts[i]);
    try{
      const valid=validateGeoRing(section);
      sections.push({name:"Sector "+(i+1),ring:valid.ring,areaHectares:valid.areaHectares,index:i+1});
    }catch{return null;}
  }
  const fences=cuts.reduce((total,cut)=>total+approximateFenceLength(ring,axis,cut),0);
  const metersPerDegree=axis==="latitude"?111320:111320*Math.cos(ring[0][1]*Math.PI/180);
  const interference=points.filter(p=>p.kind==="HOUSE"||p.kind==="CORRAL").reduce((total,p)=>
    total+cuts.filter(cut=>Math.abs((axis==="latitude"?p.lat:p.lng)-cut)*metersPerDegree<75).length*1000,0);
  return {
    zones:sections,axis,totalFenceMetersEstimate:Math.round(fences+interference),
    caution:[
      "Propuesta geométrica esquemática sobre un polígono convexo; no es trazado de cercas listo para ejecutar.",
      "La orientación prioriza menor longitud aproximada de cercas y reduce cortes próximos a casa y corral.",
      "Verificar puntos de agua, pendientes, suelos, áreas inundables, caminos y manejo animal en campo.",
    ],
  };
}
export function createPaddockSketch(ring:GeoRing,count:number,points:LocationPoint[]=[]):PaddockSketch|null {
  if(!Number.isInteger(count)||count<2||count>20)return null;
  let normalized:GeoRing;
  try{normalized=validateGeoRing(ring).ring;}catch{return null;}
  if(!convex(normalized))return null;
  const plans=[candidate(normalized,count,"latitude",points),candidate(normalized,count,"longitude",points)]
    .filter((p):p is PaddockSketch=>p!==null);
  return plans.sort((a,b)=>a.totalFenceMetersEstimate-b.totalFenceMetersEstimate)[0]??null;
}
