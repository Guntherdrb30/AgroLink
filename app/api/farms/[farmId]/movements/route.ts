import { allowedFarmIds } from "@/lib/permissions/farm-access";
import { NextResponse } from "next/server";
import { getCurrentTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { recordLivestockMove, type MoveInput } from "@/server/services/livestock-movement-service";
export const dynamic="force-dynamic";
type Context={params:Promise<{farmId:string}>};
const out=(x:unknown,status=200)=>NextResponse.json(x,{status,headers:{"Cache-Control":"private, no-store"}});
export async function GET(_:Request,{params}:Context){
 const {farmId}=await params;const current=await getCurrentTenant();if(!current)return out({error:"Sin sesión"},401);const allowed=await allowedFarmIds(current.tenant.id,current.user.id,current.membership.role);if(allowed&&!allowed.includes(farmId))return out({error:"Finca no autorizada"},403);
 const source=await prisma.farm.findFirst({where:{id:farmId,tenantId:current.tenant.id},select:{id:true}});
 if(!source)return out({error:"Finca no encontrada"},404);
 const [farms,animals,areas,moves]=await Promise.all([
 prisma.farm.findMany({where:{tenantId:current.tenant.id,...(allowed?{id:{in:allowed}}:{})},select:{id:true,name:true},orderBy:{name:"asc"}}),
 prisma.animal.findMany({where:{tenantId:current.tenant.id,farmId},select:{id:true,internalCode:true,visualIdentification:true,currentWeightKg:true},orderBy:{internalCode:"asc"},take:1000}),
 prisma.farmGeoArea.findMany({where:{tenantId:current.tenant.id,...(allowed?{farmId:{in:allowed}}:{}),kind:{in:["PADDOCK","FOUNDATION"]}},select:{id:true,farmId:true,kind:true,name:true},orderBy:{name:"asc"}}),
 prisma.livestockMovement.findMany({where:{tenantId:current.tenant.id,OR:[{fromFarmId:farmId},{toFarmId:farmId}]},include:{animals:{select:{codeSnapshot:true}}},orderBy:{createdAt:"desc"},take:40}),
 ]);
 return out({farms,animals:animals.map(a=>({...a,currentWeightKg:a.currentWeightKg?.toString()??null})),areas,moves});
}
export async function POST(request:Request,{params}:Context){
 const {farmId}=await params;const current=await getCurrentTenant();if(!current)return out({error:"Sin sesión"},401);const allowed=await allowedFarmIds(current.tenant.id,current.user.id,current.membership.role);if(allowed&&!allowed.includes(farmId))return out({error:"Finca no autorizada"},403);
 if(!["TENANT_OWNER","TENANT_ADMIN","FARM_MANAGER"].includes(current.membership.role))return out({error:"Sin permisos"},403);
 const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return out({error:"Origen inválido"},403);
 let input:MoveInput;try{const raw=await request.text();if(raw.length>30000)return out({error:"Petición excesiva"},413);input=JSON.parse(raw)}catch{return out({error:"Datos inválidos"},400)}
 if(input.fromFarmId!==farmId)return out({error:"Finca de origen inválida"},400);
 if(allowed&&!allowed.includes(input.toFarmId))return out({error:"Destino no autorizado"},403);
 try{const result=await recordLivestockMove(current.tenant.id,current.user.id,input);return out(result,result.duplicate?200:201)}
 catch(error){
  const msg=error instanceof Error?error.message:"Error desconocido";
  const messages:Record<string,string>={DATOS_INCOMPLETOS:"Faltan datos del traslado",ORIGEN_DESTINO_IGUALES:"Selecciona otro destino",ANIMALES_INVALIDOS:"Selecciona entre 1 y 100 animales distintos",MOTIVO_INVALIDO:"Indica el motivo del traslado",FECHA_INVALIDA:"Fecha inválida",FINCA_INVALIDA:"Finca no disponible",AREA_INVALIDA:"Fundación o potrero no válido",ANIMAL_CAMBIO_DE_ORIGEN:"Los animales cambiaron de finca; actualiza el listado",UBICACION_ACTUAL_CAMBIO:"La ubicación actual ya cambió. Actualiza antes de trasladar",ORIGEN_DESACTUALIZADO:"Finca de origen desactualizada",FECHA_ANTERIOR_A_ULTIMO_MOVIMIENTO:"La fecha es anterior a un movimiento registrado",ANIMAL_MODIFICADO_EN_OTRA_SESION:"Otro usuario modificó el animal"};
  if(msg==="P2034"||msg.includes("could not serialize"))return out({error:"Operación simultánea. Actualiza y reintenta"},409);
  return out({error:messages[msg]??"No se pudo registrar el traslado. Revisa y vuelve a intentar"},409);
 }
}
