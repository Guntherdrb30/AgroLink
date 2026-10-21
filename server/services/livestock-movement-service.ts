import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

export type MoveInput = {
  fromFarmId: string; toFarmId: string; fromAreaId: string | null; toAreaId: string | null;
  animalIds: string[]; movementDate: string; reason: string; notes: string;
  requestKey: string;
};
export function validateMoveInput(v: MoveInput) {
  if(!v.fromFarmId||!v.toFarmId||!v.requestKey||v.requestKey.length>100)throw Error("DATOS_INCOMPLETOS");
  if(v.fromFarmId===v.toFarmId && v.fromAreaId===v.toAreaId)throw Error("ORIGEN_DESTINO_IGUALES");
  if(!Array.isArray(v.animalIds)||!v.animalIds.length||v.animalIds.length>100||new Set(v.animalIds).size!==v.animalIds.length)throw Error("ANIMALES_INVALIDOS");
  if(!v.reason?.trim()||v.reason.length>120||v.notes.length>500)throw Error("MOTIVO_INVALIDO");
  const date=new Date(v.movementDate);
  if(!Number.isFinite(date.getTime())||date.getTime()>Date.now()+86400000||date.getTime()<Date.now()-366*86400000)throw Error("FECHA_INVALIDA");
  return date;
}
export async function recordLivestockMove(tenantId:string,actorId:string,data:MoveInput) {
  const date=validateMoveInput(data);
  return prisma.$transaction(async tx=>{
    const previous=await tx.livestockMovement.findUnique({where:{tenantId_requestKey:{tenantId,requestKey:data.requestKey}},include:{animals:true}});
    if(previous)return {id:previous.id,count:previous.animals.length,duplicate:true};
    const farms=await tx.farm.findMany({where:{tenantId,id:{in:[data.fromFarmId,data.toFarmId]}},select:{id:true}});
    if(new Set(farms.map(f=>f.id)).size!==new Set([data.fromFarmId,data.toFarmId]).size)throw Error("FINCA_INVALIDA");
    const areas=await tx.farmGeoArea.findMany({where:{tenantId,id:{in:[data.fromAreaId,data.toAreaId].filter((x):x is string=>Boolean(x))}},select:{id:true,farmId:true,kind:true}});
    for(const [id,farmId] of [[data.fromAreaId,data.fromFarmId],[data.toAreaId,data.toFarmId]]) {
      if(id&&!areas.some(a=>a.id===id&&a.farmId===farmId&&(a.kind==="FOUNDATION"||a.kind==="PADDOCK")))throw Error("AREA_INVALIDA");
    }
    const animals=await tx.animal.findMany({where:{tenantId,id:{in:data.animalIds}},select:{id:true,farmId:true,internalCode:true}});
    if(animals.length!==data.animalIds.length||animals.some(a=>a.farmId!==data.fromFarmId))throw Error("ANIMAL_CAMBIO_DE_ORIGEN");
    const latest=await tx.livestockMovementItem.findMany({
      where:{tenantId,animalId:{in:data.animalIds}},include:{movement:true},
      orderBy:{movement:{createdAt:"desc"}},
    });
    const lastByAnimal=new Map<string,typeof latest[number]>();
    for(const row of latest){if(!lastByAnimal.has(row.animalId))lastByAnimal.set(row.animalId,row)}
    for(const animal of animals){
      const last=lastByAnimal.get(animal.id)?.movement;
      if(last && last.toFarmId===data.fromFarmId && last.toAreaId!==data.fromAreaId)throw Error("UBICACION_ACTUAL_CAMBIO");
      if(last && last.toFarmId!==data.fromFarmId)throw Error("ORIGEN_DESACTUALIZADO");
      if(last && date.getTime()<last.movementDate.getTime())throw Error("FECHA_ANTERIOR_A_ULTIMO_MOVIMIENTO");
    }
    const id=crypto.randomUUID();
    await tx.livestockMovement.create({data:{
      id,tenantId,fromFarmId:data.fromFarmId,toFarmId:data.toFarmId,fromAreaId:data.fromAreaId,
      toAreaId:data.toAreaId,movementDate:date,reason:data.reason.trim(),notes:data.notes.trim()||null,
      actorUserId:actorId,requestKey:data.requestKey,
      animals:{create:animals.map(a=>({id:crypto.randomUUID(),tenantId,animalId:a.id,codeSnapshot:a.internalCode}))},
    }});
    for(const animal of animals){
      const changed=await tx.animal.updateMany({where:{id:animal.id,tenantId,farmId:data.fromFarmId},data:{farmId:data.toFarmId,lotOrZone:null}});
      if(changed.count!==1)throw Error("ANIMAL_MODIFICADO_EN_OTRA_SESION");
      await tx.animalEvent.create({data:{
        tenantId,animalId:animal.id,actorUserId:actorId,eventType:"TRANSFER",
        title:"Traslado ganadero registrado",description:data.reason.trim(),eventDate:date,
        metadata:{movementId:id,fromFarmId:data.fromFarmId,toFarmId:data.toFarmId,fromAreaId:data.fromAreaId,toAreaId:data.toAreaId},
      }});
    }
    return {id,count:animals.length,duplicate:false};
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:15000,maxWait:10000});
}
