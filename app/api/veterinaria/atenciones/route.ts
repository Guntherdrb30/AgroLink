import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { canWriteClinicalRecord, validateClinicalDates } from "@/lib/veterinary/clinical-policy";
export const dynamic = "force-dynamic";
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
const inputSchema=z.discriminatedUnion("kind",[
 z.object({kind:z.literal("vaccination"),farmId:z.string().min(1).max(100),animalId:z.string().min(1).max(100),
 name:z.string().trim().min(2).max(160),appliedAt:z.string(),followUpAt:z.string().optional(),
 dose:z.string().trim().max(100).optional(),batch:z.string().trim().max(120).optional(),note:z.string().trim().max(1000).optional()}),
 z.object({kind:z.literal("treatment"),farmId:z.string().min(1).max(100),animalId:z.string().min(1).max(100),
 name:z.string().trim().min(2).max(160),appliedAt:z.string(),followUpAt:z.string().optional(),
 diagnosis:z.string().trim().max(500).optional(),medicine:z.string().trim().max(160).optional(),
 dose:z.string().trim().max(100).optional(),note:z.string().trim().max(1000).optional()}),
]);
export async function POST(request:Request) {
 const ctx=await getCurrentTenant();
 if(!ctx)return reply({error:"Sesión requerida"},401);
 if(ctx.membership.role!=="VETERINARIAN")return reply({error:"Solo un veterinario asignado puede registrar atenciones"},403);
 if(request.headers.get("origin")!==new URL(request.url).origin)return reply({error:"Origen no autorizado"},403);
 if(!request.headers.get("content-type")?.startsWith("application/json"))return reply({error:"Formato no admitido"},415);
 const raw=await request.text();if(raw.length>3500)return reply({error:"Contenido demasiado extenso"},413);
 let parsed;try{parsed=inputSchema.safeParse(JSON.parse(raw))}catch{return reply({error:"Solicitud inválida"},400)}
 if(!parsed.success)return reply({error:"Revisa los datos de la atención"},422);
 const input=parsed.data;
 if(!validateClinicalDates(input.appliedAt,input.followUpAt))return reply({error:"Fecha de atención inválida o futura; revisa el control posterior"},422);
 try{
  const saved=await prisma.$transaction(async tx=>{
   const [membership,grant,animal,profile]=await Promise.all([
    tx.tenantMembership.findUnique({where:{tenantId_userId:{tenantId:ctx.tenant.id,userId:ctx.user.id}},select:{role:true}}),
    tx.tenantFarmAccess.findUnique({where:{tenantId_userId_farmId:{tenantId:ctx.tenant.id,userId:ctx.user.id,farmId:input.farmId}},select:{id:true}}),
    tx.animal.findFirst({where:{id:input.animalId,tenantId:ctx.tenant.id,farmId:input.farmId},select:{id:true,farmId:true}}),
    tx.veterinaryProfessionalProfile.findUnique({where:{tenantId_userId:{tenantId:ctx.tenant.id,userId:ctx.user.id}},select:{id:true}}),
   ]);
   if(!canWriteClinicalRecord({role:membership?.role||"",sameTenant:Boolean(membership),
      assignedToFarm:Boolean(grant),animalInFarm:Boolean(animal),professionalProfilePresent:Boolean(profile)}))throw Error("CLINICAL_SCOPE_DENIED");
   const common={tenantId:ctx.tenant.id,animalId:input.animalId,recordedById:ctx.user.id,veterinaryProfileId:profile!.id};
   const record=input.kind==="vaccination"
    ? await tx.animalVaccinationRecord.create({data:{...common,vaccineName:input.name,appliedAt:new Date(input.appliedAt+"T12:00:00Z"),
       dose:input.dose||null,batch:input.batch||null,nextDueAt:input.followUpAt?new Date(input.followUpAt+"T12:00:00Z"):null,note:input.note||null},select:{id:true}})
    : await tx.animalTreatmentRecord.create({data:{...common,treatmentName:input.name,appliedAt:new Date(input.appliedAt+"T12:00:00Z"),
       diagnosis:input.diagnosis||null,medicine:input.medicine||null,dose:input.dose||null,
       withdrawalUntil:input.followUpAt?new Date(input.followUpAt+"T12:00:00Z"):null,note:input.note||null},select:{id:true}});
   await tx.animalEvent.create({data:{tenantId:ctx.tenant.id,animalId:input.animalId,actorUserId:ctx.user.id,
     eventType:input.kind==="vaccination"?"VACCINATION":"TREATMENT",title:input.name,
     description:"Atención clínica registrada por veterinario asignado",eventDate:new Date(input.appliedAt+"T12:00:00Z"),
     metadata:{recordId:record.id,veterinaryProfileId:profile!.id,origin:"GANADIA_VETERINARY_WORKSPACE"}}});
   await tx.auditLog.create({data:{tenantId:ctx.tenant.id,actorUserId:ctx.user.id,
    entityType:input.kind==="vaccination"?"AnimalVaccinationRecord":"AnimalTreatmentRecord",
    entityId:record.id,action:"VETERINARY_CLINICAL_RECORD_CREATED",
    metadata:{animalId:input.animalId,farmId:input.farmId,veterinaryProfileId:profile!.id,kind:input.kind}}});
   return {id:record.id};
  });
  return reply({ok:true,...saved,kind:input.kind},201);
 }catch(error) {
  if(error instanceof Error&&error.message==="CLINICAL_SCOPE_DENIED")return reply({error:"No tienes acceso clínico a este animal o falta completar tu ficha profesional"},403);
  console.error("VETERINARY_CLINICAL_WRITE_FAILED",error);
  return reply({error:"No se pudo guardar la atención; no se realizó una modificación parcial"},500);
 }
}
