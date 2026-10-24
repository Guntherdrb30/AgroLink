import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { allowedFarmIds } from "@/lib/permissions/farm-access";
import type { GanadiaContext } from "@/lib/ai/ganadia-tools";

type DraftInput = {
 farmId:string;buyerName:string;buyerDocument?:string;destination?:string;
 animalIds:string[];pricePerKgCents:number;currency:string;notes?:string;requestKey:string;saleDate:string;
};
export function validateSale(input:DraftInput) {
 if(!input.farmId||!input.requestKey||input.requestKey.length>100)throw Error("INVALID_REQUEST");
 if(!input.buyerName?.trim()||input.buyerName.length>150)throw Error("BUYER_REQUIRED");
 if(!Array.isArray(input.animalIds)||!input.animalIds.length||input.animalIds.length>100||new Set(input.animalIds).size!==input.animalIds.length||input.animalIds.some(a=>typeof a!=="string"||!a||a.length>120))throw Error("INVALID_ANIMALS");
 if(!Number.isSafeInteger(input.pricePerKgCents)||input.pricePerKgCents<0||input.pricePerKgCents>10_000_000)throw Error("INVALID_PRICE");
 if(!["USD","VES"].includes(input.currency))throw Error("INVALID_CURRENCY");
 if((input.notes||"").length>1000||(input.destination||"").length>200||(input.buyerDocument||"").length>100)throw Error("INVALID_DETAILS");
 const date=new Date(input.saleDate);
 if(!Number.isFinite(date.getTime())||date.getTime()>Date.now()+86400000||date.getTime()<Date.now()-366*86400000)throw Error("INVALID_DATE");
 return date;
}
async function assertFarm(ctx:GanadiaContext,farmId:string) {
 if(!["TENANT_OWNER","TENANT_ADMIN","FARM_MANAGER"].includes(ctx.membership.role))throw Error("SALE_ROLE_DENIED");
 const permitted=await allowedFarmIds(ctx.tenant.id,ctx.user.id,ctx.membership.role);
 if(permitted&&!permitted.includes(farmId))throw Error("FARM_DENIED");
 const farm=await prisma.farm.findFirst({where:{id:farmId,tenantId:ctx.tenant.id},select:{id:true}});
 if(!farm)throw Error("FARM_DENIED");
}
export async function makeSaleDraft(ctx:GanadiaContext,input:DraftInput) {
 const date=validateSale(input);await assertFarm(ctx,input.farmId);
 return prisma.$transaction(async tx=>{
  const duplicate=await tx.livestockSale.findUnique({where:{tenantId_requestKey:{tenantId:ctx.tenant.id,requestKey:input.requestKey}},select:{id:true}});
  if(duplicate)return {id:duplicate.id,duplicate:true};
  const animals=await tx.animal.findMany({where:{tenantId:ctx.tenant.id,farmId:input.farmId,id:{in:input.animalIds},inventoryStatus:"ACTIVE"},select:{
   id:true,internalCode:true,sex:true,currentWeightKg:true,
   weightRecords:{orderBy:[{recordedAt:"desc"},{createdAt:"desc"}],take:1,select:{weightKg:true,recordedAt:true}},
  }});
  if(animals.length!==input.animalIds.length)throw Error("ANIMALS_UNAVAILABLE");
  let sumWeight=0,total=0;
  const items=animals.map(a=>{
   const last=a.weightRecords[0];
   const source=last?last.weightKg:a.currentWeightKg;
   const weight=Math.round(Number(source)*100);
   if(!Number.isSafeInteger(weight)||weight<=0)throw Error("WEIGHT_REQUIRED");
   const subtotal=Math.round(weight*input.pricePerKgCents/100);
   if(!Number.isSafeInteger(subtotal))throw Error("INVALID_PRICE");
   sumWeight+=weight;total+=subtotal;
   return {id:crypto.randomUUID(),tenantId:ctx.tenant.id,animalId:a.id,codeSnapshot:a.internalCode,sexSnapshot:a.sex,weightKg:new Prisma.Decimal(weight).div(100),weightSource:last?"LAST_WEIGHING":"DECLARED",lastWeighedAt:last?.recordedAt||null,subtotalCents:subtotal};
  });
  if(!Number.isSafeInteger(total)||!Number.isSafeInteger(sumWeight))throw Error("INVALID_TOTAL");
  const id=crypto.randomUUID();
  const number="GI-"+new Date().toISOString().slice(0,10).replaceAll("-","")+"-"+id.slice(0,8).toUpperCase();
  await tx.livestockSale.create({data:{
   id,tenantId:ctx.tenant.id,farmId:input.farmId,number,status:"DRAFT",buyerName:input.buyerName.trim(),
   buyerDocument:input.buyerDocument?.trim()||null,destination:input.destination?.trim()||null,
   saleDate:date,currency:input.currency,pricePerKgCents:input.pricePerKgCents,
   totalWeightKg:new Prisma.Decimal(sumWeight).div(100),totalCents:total,
   notes:input.notes?.trim()||null,requestKey:input.requestKey,createdById:ctx.user.id,
   items:{create:items},
  }});
  return {id,duplicate:false};
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:20000,maxWait:10000});
}
export async function loadSale(ctx:GanadiaContext,id:string){
 if(!["TENANT_OWNER","TENANT_ADMIN","FARM_MANAGER","ACCOUNTING"].includes(ctx.membership.role))return null;
 const allowed=await allowedFarmIds(ctx.tenant.id,ctx.user.id,ctx.membership.role);
 return prisma.livestockSale.findFirst({where:{id,tenantId:ctx.tenant.id,...(allowed?{farmId:{in:allowed}}:{})},
 include:{farm:{select:{id:true,name:true,location:true,logoUrl:true,logoFileId:true}},
 items:{select:{animalId:true,codeSnapshot:true,sexSnapshot:true,weightKg:true,weightSource:true,lastWeighedAt:true,subtotalCents:true}}}});
}
export async function confirmInternalSale(ctx:GanadiaContext,id:string,confirm:boolean){
 if(confirm!==true)throw Error("CONFIRMATION_REQUIRED");
 const existing=await loadSale(ctx,id);if(!existing)throw Error("SALE_NOT_FOUND");
 await assertFarm(ctx,existing.farmId);
 return prisma.$transaction(async tx=>{
  const locked=await tx.$queryRaw(Prisma.sql(["SELECT \"id\" FROM \"LivestockSale\" WHERE \"id\"=", " AND \"tenantId\"=", " FOR UPDATE"] as any,id,ctx.tenant.id));
  if(!Array.isArray(locked)||!locked.length)throw Error("SALE_NOT_FOUND");
  const sale=await tx.livestockSale.findUnique({where:{id},include:{items:true}});
  if(!sale||sale.tenantId!==ctx.tenant.id)throw Error("SALE_NOT_FOUND");
  if(sale.status==="CONFIRMED")return {id,count:sale.items.length,duplicate:true};
  if(sale.status!=="DRAFT"||!sale.items.length)throw Error("SALE_INVALID");
  for(const item of sale.items){
   const changed=await tx.animal.updateMany({where:{id:item.animalId,tenantId:ctx.tenant.id,farmId:sale.farmId,inventoryStatus:"ACTIVE"},data:{inventoryStatus:"SOLD",soldAt:new Date()}});
   if(changed.count!==1)throw Error("ANIMAL_ALREADY_SOLD");
   await tx.animalEvent.create({data:{tenantId:ctx.tenant.id,animalId:item.animalId,actorUserId:ctx.user.id,eventType:"SALE",title:"Venta interna confirmada",description:"Comprobante "+sale.number,eventDate:sale.saleDate,metadata:{saleId:id,receipt:sale.number,weightKg:item.weightKg.toString()}}});
  }
  const changed=await tx.livestockSale.updateMany({where:{id,tenantId:ctx.tenant.id,status:"DRAFT"},data:{status:"CONFIRMED",confirmedById:ctx.user.id,confirmedAt:new Date()}});
  if(changed.count!==1)throw Error("SALE_CONCURRENT");
  await tx.auditLog.create({data:{tenantId:ctx.tenant.id,actorUserId:ctx.user.id,entityType:"LIVESTOCK_SALE",entityId:id,action:"CONFIRMED",metadata:{number:sale.number,count:sale.items.length}}});
  return {id,count:sale.items.length,duplicate:false};
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:30000,maxWait:10000});
}
