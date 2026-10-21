import { NextResponse } from "next/server";
import { getCurrentTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
export const dynamic="force-dynamic";
type C={params:Promise<{farmId:string}>};
const send=(x:unknown,status=200)=>NextResponse.json(x,{status,headers:{"Cache-Control":"private,no-store"}});
async function scope(farmId:string){
 const c=await getCurrentTenant();if(!c)return null;
 const farm=await prisma.farm.findFirst({where:{id:farmId,tenantId:c.tenant.id},select:{id:true,name:true}});
 return farm?{c,farm}:null;
}
const text=(x:unknown,max=120)=>typeof x==="string"?x.trim().slice(0,max):"";
const cents=(x:unknown)=>typeof x==="number"&&Number.isInteger(x)&&x>=0&&x<=1e9?x:null;
const currency=(x:unknown)=>x==="USD"||x==="VES"?x:null;
const kinds=(v:unknown,allowed:string[])=>typeof v==="string"&&allowed.includes(v)?v:null;
const qty=(n:unknown)=>typeof n==="number"&&Number.isFinite(n)&&n>0&&n<=100000000&&Number(n.toFixed(3))===n?n:null;
export async function GET(_:Request,{params}:C){
 const {farmId}=await params;const access=await scope(farmId);if(!access)return send({error:"Finca no disponible"},404);
 const tid=access.c.tenant.id,where={tenantId:tid,farmId};
 const [partners,items,stock,finances,staff,payrolls,employees]=await Promise.all([
 prisma.farmErpPartner.findMany({where,orderBy:{name:"asc"},take:250}),
 prisma.farmErpItem.findMany({where,orderBy:{name:"asc"},take:500}),
 prisma.farmErpStockMove.findMany({where,orderBy:{createdAt:"desc"},take:100}),
 prisma.farmErpFinance.findMany({where,orderBy:{occurredAt:"desc"},take:500}),
 prisma.farmErpStaff.findMany({where,include:{employee:{select:{id:true,fullName:true}}},take:200}),
 prisma.farmErpPayroll.findMany({where,orderBy:{createdAt:"desc"},take:150}),
 prisma.employee.findMany({where:{tenantId:tid},select:{id:true,fullName:true},orderBy:{fullName:"asc"}})
 ]);
 return send({farm:access.farm,partners,items:items.map(i=>({...i,quantity:Number(i.quantity),minQuantity:Number(i.minQuantity)})),stock:stock.map(m=>({...m,quantity:Number(m.quantity)})),finances,staff,payrolls,employees});
}
export async function POST(request:Request,{params}:C){
 const {farmId}=await params;const access=await scope(farmId);if(!access)return send({error:"Finca no disponible"},404);
 if(!["TENANT_OWNER","TENANT_ADMIN","FARM_MANAGER"].includes(access.c.membership.role))return send({error:"Sin permiso"},403);
 const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return send({error:"Origen inválido"},403);
 let body:Record<string,unknown>;
 try{const raw=await request.text();if(raw.length>18000)return send({error:"Solicitud extensa"},413);body=JSON.parse(raw);}
 catch{return send({error:"Datos inválidos"},400)}
 const action=text(body.action,30),tid=access.c.tenant.id,actor=access.c.user.id;
 const where={tenantId:tid,farmId};
 try{
  if(action==="partner"){
   const name=text(body.name,100),kind=kinds(body.kind,["SUPPLIER","CUSTOMER","BOTH"]);
   if(name.length<2||!kind)return send({error:"Nombre y tipo de tercero requeridos"},400);
   const v=await prisma.farmErpPartner.create({data:{id:crypto.randomUUID(),...where,name,kind,rif:text(body.rif,35)||null,phone:text(body.phone,50)||null}});
   return send({ok:true,id:v.id},201);
  }
  if(action==="item"){
   const sku=text(body.sku,50),name=text(body.name,120),kind=kinds(body.kind,["SUPPLY","ASSET"]),unit=text(body.unit,35),cur=currency(body.currency);
   if(!sku||!name||!kind||!unit||!cur)return send({error:"Completa artículo, clase, unidad y moneda"},400);
   const price=body.unitCostCents===null?null:cents(body.unitCostCents);
   if(body.unitCostCents!==null&&price===null)return send({error:"Costo inválido"},400);
   const item=await prisma.farmErpItem.create({data:{id:crypto.randomUUID(),...where,sku,name,kind,unit,currency:cur,unitCostCents:price,serial:text(body.serial,100)||null}});
   return send({ok:true,id:item.id},201);
  }
  if(action==="stock"){
   const id=text(body.itemId,120),kind=kinds(body.kind,["RECEIPT","USE","ADJUST_PLUS","ADJUST_MINUS"]),amount=qty(body.quantity),key=text(body.requestKey,120);
   if(!id||!kind||!amount||!key)return send({error:"Artículo, cantidad y operación requeridos"},400);
   const partnerId=text(body.partnerId,120)||null;
   const result=await prisma.$transaction(async tx=>{
    const prior=await tx.farmErpStockMove.findUnique({where:{farmId_requestKey:{farmId,requestKey:key}}});if(prior)return {id:prior.id,duplicate:true};
    if(partnerId&&!await tx.farmErpPartner.findFirst({where:{id:partnerId,...where}}))throw Error("PROVEEDOR_INVALIDO");
    const item=await tx.farmErpItem.findFirst({where:{id,...where}});if(!item)throw Error("ARTICULO_INVALIDO");
    const subtract=kind==="USE"||kind==="ADJUST_MINUS";
    const signed=subtract?-amount:amount;
    const updated=await tx.farmErpItem.updateMany({where:{id,...where,...(subtract?{quantity:{gte:amount}}:{})},data:{quantity:{increment:signed}}});
    if(updated.count!==1)throw Error("SALDO_INSUFICIENTE");
    const record=await tx.farmErpStockMove.create({data:{id:crypto.randomUUID(),...where,itemId:id,kind,quantity:amount,partnerId,requestKey:key,actorUserId:actor,note:text(body.note,250)||null}});
    return {id:record.id,duplicate:false};
   },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
   return send({ok:true,...result},result.duplicate?200:201);
  }
  if(action==="finance"){
   const kind=kinds(body.kind,["INCOME","EXPENSE","PAYABLE","RECEIVABLE","PAYMENT_IN","PAYMENT_OUT"]);
   const amount=cents(body.amountCents),cur=currency(body.currency),description=text(body.description,200),key=text(body.requestKey,120);
   const relatedId=text(body.relatedId,120)||null,partnerId=text(body.partnerId,120)||null;
   if(!kind||amount===null||amount===0||!cur||!description||!key)return send({error:"Tipo, importe, moneda y concepto requeridos"},400);
   const paid=kind==="PAYMENT_IN"||kind==="PAYMENT_OUT";
   if(paid&&!relatedId)return send({error:"El pago debe vincularse a una cuenta por cobrar o pagar"},400);
   const result=await prisma.$transaction(async tx=>{
    const prior=await tx.farmErpFinance.findUnique({where:{farmId_requestKey:{farmId,requestKey:key}}});if(prior)return {id:prior.id,duplicate:true};
    if(partnerId&&!await tx.farmErpPartner.findFirst({where:{id:partnerId,...where}}))throw Error("TERCERO_INVALIDO");
    if(paid){
     const parent=await tx.farmErpFinance.findFirst({where:{id:relatedId!,...where}});
     if(!parent||parent.kind!==(kind==="PAYMENT_IN"?"RECEIVABLE":"PAYABLE")||parent.currency!==cur)throw Error("CUENTA_INVALIDA");
     const previous=await tx.farmErpFinance.aggregate({where:{relatedId,...where,kind},_sum:{amountCents:true}});
     if((previous._sum.amountCents??0)+amount>parent.amountCents)throw Error("PAGO_EXCEDE_SALDO");
    }
    const row=await tx.farmErpFinance.create({data:{id:crypto.randomUUID(),...where,kind,amountCents:amount,currency:cur,description,requestKey:key,actorUserId:actor,partnerId,relatedId,occurredAt:new Date(),reference:text(body.reference,100)||null}});
    return {id:row.id,duplicate:false};
   },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
   return send({ok:true,...result},result.duplicate?200:201);
  }
  if(action==="staff"){
   const employeeId=text(body.employeeId,100),role=text(body.role,80);
   if(!employeeId||!role)return send({error:"Empleado y cargo requeridos"},400);
   const employee=await prisma.employee.findFirst({where:{id:employeeId,tenantId:tid}});if(!employee)return send({error:"Empleado no pertenece a la empresa"},400);
   const row=await prisma.farmErpStaff.upsert({where:{farmId_employeeId:{farmId,employeeId}},create:{id:crypto.randomUUID(),...where,employeeId,role},update:{role,active:true}});
   return send({ok:true,id:row.id},201);
  }
  if(action==="payroll"){
   const employeeId=text(body.employeeId,100),cur=currency(body.currency),base=cents(body.baseCents),extra=cents(body.extraCents),deduction=cents(body.deductionCents);
   const start=text(body.startAt,10),end=text(body.endAt,10);
   if(!employeeId||!cur||base===null||extra===null||deduction===null||base+extra<deduction||!/\d{4}-\d\d-\d\d/.test(start)||!/\d{4}-\d\d-\d\d/.test(end)||start>end)return send({error:"Revisa fechas e importes de nómina"},400);
   if(!await prisma.farmErpStaff.findFirst({where:{...where,employeeId,active:true}}))return send({error:"Primero asigna el empleado a la finca"},400);
   const row=await prisma.farmErpPayroll.create({data:{id:crypto.randomUUID(),...where,employeeId,currency:cur,baseCents:base,extraCents:extra,deductionCents:deduction,netCents:base+extra-deduction,startAt:new Date(start+"T00:00:00Z"),endAt:new Date(end+"T00:00:00Z"),actorUserId:actor,status:"DRAFT"}});
   return send({ok:true,id:row.id},201);
  }
  return send({error:"Operación no reconocida"},400);
 }catch(error){
  const msg=error instanceof Error?error.message:"Error";
  return send({error:msg.includes("Unique")||msg.includes("P2002")?"Registro duplicado":msg.includes("P2034")?"Actualización simultánea: reintenta":/^[A-Z_]+$/.test(msg)?msg:"No se pudo guardar el registro"},409);
 }
}