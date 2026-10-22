import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
export const dynamic="force-dynamic";
export async function POST(request:Request) {
 const user=await getCurrentUser();
 if(!user||!user.emailVerified)return NextResponse.json({error:"Primero verifica tu correo en Clerk"}, {status:401});
 if(request.headers.get("origin")!==new URL(request.url).origin)return NextResponse.json({error:"Origen invalido"},{status:403});
 const raw=await request.text();if(raw.length>300)return NextResponse.json({error:"Solicitud excesiva"},{status:413});
 let token="";try{const body=JSON.parse(raw);if(typeof body.token==="string")token=body.token}catch{}
 if(!/^[a-f0-9]{64}$/.test(token))return NextResponse.json({error:"Invitacion invalida"},{status:400});
 const hash=createHash("sha256").update(token).digest("hex");
 try{
 const result=await prisma.$transaction(async tx=>{
  const invite=await tx.tenantInvitation.findUnique({where:{tokenHash:hash}});
  if(!invite||invite.status!=="PENDING"||invite.expiresAt.getTime()<Date.now()||invite.email!==user.email.toLowerCase())throw Error("INVITACION_INVALIDA");
  const member=await tx.tenantMembership.findUnique({where:{tenantId_userId:{tenantId:invite.tenantId,userId:user.id}}});
  if(member)throw Error("YA_ES_MIEMBRO");
  const ids=Array.isArray(invite.farmIds)&&invite.farmIds.every(id=>typeof id==="string")?invite.farmIds as string[]:[];
  if(invite.role!=="TENANT_ADMIN"&&ids.length===0)throw Error("SIN_FINCAS");
  const count=await tx.farm.count({where:{tenantId:invite.tenantId,id:{in:ids}}});
  if(count!==ids.length)throw Error("FINCAS_DESACTUALIZADAS");
  const marked=await tx.tenantInvitation.updateMany({where:{id:invite.id,status:"PENDING",expiresAt:{gt:new Date()}},data:{status:"ACCEPTED",acceptedById:user.id,acceptedAt:new Date()}});
  if(marked.count!==1)throw Error("INVITACION_USADA");
  await tx.tenantMembership.create({data:{tenantId:invite.tenantId,userId:user.id,role:invite.role,isDefault:!user.defaultTenantId}});
  if(ids.length)await tx.tenantFarmAccess.createMany({data:ids.map(farmId=>({tenantId:invite.tenantId,userId:user.id,farmId}))});
  if(!user.defaultTenantId)await tx.user.updateMany({where:{id:user.id,defaultTenantId:null},data:{defaultTenantId:invite.tenantId}});
  return invite.tenantId;
 });
 return NextResponse.json({ok:true,tenantId:result},{headers:{"Cache-Control":"private,no-store"}});
 }catch(e){const msg=e instanceof Error?e.message:"ERROR";return NextResponse.json({error:msg==="INVITACION_INVALIDA"?"Enlace vencido, usado o pertenece a otro correo":msg==="YA_ES_MIEMBRO"?"Ya formas parte de esta empresa":"No se pudo aceptar la invitacion"},{status:409})}
}