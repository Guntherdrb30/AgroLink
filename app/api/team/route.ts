import { NextResponse } from "next/server";
import { randomBytes, createHash } from "node:crypto";
import { getCurrentTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";
const respond=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"private,no-store"}});
const scopedRoles=["FARM_MANAGER","ACCOUNTING","VETERINARIAN","OPERATOR"] as const;
const assignableRoles=[...scopedRoles,"TENANT_ADMIN"] as const;

export async function GET(){
 const ctx=await getCurrentTenant();
 if(!ctx||!["TENANT_OWNER","TENANT_ADMIN"].includes(ctx.membership.role))return respond({error:"Sin permiso"},403);
 const [members, invitations,farms]=await Promise.all([
  prisma.tenantMembership.findMany({where:{tenantId:ctx.tenant.id},select:{userId:true,role:true,user:{select:{email:true,name:true}},createdAt:true},orderBy:{createdAt:"asc"}}),
  prisma.tenantInvitation.findMany({where:{tenantId:ctx.tenant.id},select:{id:true,email:true,role:true,farmIds:true,status:true,expiresAt:true},orderBy:{createdAt:"desc"},take:100}),
  prisma.farm.findMany({where:{tenantId:ctx.tenant.id},select:{id:true,name:true},orderBy:{name:"asc"}}),
 ]);
 const grants=await prisma.tenantFarmAccess.findMany({where:{tenantId:ctx.tenant.id},select:{userId:true,farmId:true}});
 return respond({currentUserId:ctx.user.id,members:members.map(m=>({...m,farms:grants.filter(g=>g.userId===m.userId).map(g=>g.farmId)})),invitations,farms});
}
export async function POST(request:Request){
 const ctx=await getCurrentTenant();
 if(!ctx||!["TENANT_OWNER","TENANT_ADMIN"].includes(ctx.membership.role))return respond({error:"Sin permiso"},403);
 if(request.headers.get("origin")!==new URL(request.url).origin)return respond({error:"Origen no autorizado"},403);
 const raw=await request.text();if(raw.length>5000)return respond({error:"Solicitud excesiva"},413);
 let body:{email?:unknown;role?:unknown;farmIds?:unknown};try{body=JSON.parse(raw)}catch{return respond({error:"Datos invalidos"},400)}
 const email=typeof body.email==="string"?body.email.trim().toLowerCase():"";
 const role=typeof body.role==="string"?body.role:"";
 const farmIds=Array.isArray(body.farmIds)&&body.farmIds.every((x:unknown)=>typeof x==="string")?[...new Set(body.farmIds as string[])]:[];
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>255||!assignableRoles.includes(role as typeof assignableRoles[number]))return respond({error:"Correo o rol invalido"},400);
 if(role==="TENANT_ADMIN"&&ctx.membership.role!=="TENANT_OWNER")return respond({error:"Solo el propietario puede invitar administradores"},403);
 if(role!=="TENANT_ADMIN"&&!farmIds.length)return respond({error:"Asigna al menos una finca"},400);
 const actual=await prisma.farm.count({where:{tenantId:ctx.tenant.id,id:{in:farmIds}}});
 if(actual!==farmIds.length||farmIds.length>100)return respond({error:"Una finca no pertenece a esta empresa"},403);
 const existing=await prisma.user.findUnique({where:{email},select:{id:true,memberships:{where:{tenantId:ctx.tenant.id},select:{id:true}}}});
 if(existing?.memberships.length)return respond({error:"El usuario ya pertenece a la empresa"},409);
 const token=randomBytes(32).toString("hex");const tokenHash=createHash("sha256").update(token).digest("hex");
 const expiry=new Date(Date.now()+7*24*60*60*1000);
 const invitation=await prisma.tenantInvitation.create({data:{tenantId:ctx.tenant.id,email,role:role as typeof assignableRoles[number],farmIds,tokenHash,createdById:ctx.user.id,expiresAt:expiry},select:{id:true}});
 const url=new URL("/join",request.url);url.searchParams.set("token",token);
 return respond({id:invitation.id,invitationUrl:url.toString(),expiresAt:expiry.toISOString(),warning:"Enlace secreto de un solo uso, destinado exclusivamente al correo invitado."},201);
}
