import { getCurrentTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { allowedFarmIds } from "@/lib/permissions/farm-access";
import { SalesClient } from "@/components/sales/sales-client";
export const dynamic="force-dynamic";
export default async function SalesPage(){
 const ctx=await getCurrentTenant();
 if(!ctx||!["TENANT_OWNER","TENANT_ADMIN","FARM_MANAGER","ACCOUNTING"].includes(ctx.membership.role))
   return <section className="p-6">Tu perfil no dispone de acceso a ventas.</section>;
 const grants=await allowedFarmIds(ctx.tenant.id,ctx.user.id,ctx.membership.role);
 const farms=await prisma.farm.findMany({where:{tenantId:ctx.tenant.id,...(grants?{id:{in:grants}}:{})},select:{id:true,name:true},orderBy:{name:"asc"}});
 const animals=await prisma.animal.findMany({where:{tenantId:ctx.tenant.id,inventoryStatus:"ACTIVE",farmId:{in:farms.map(f=>f.id)}},select:{
   id:true,farmId:true,internalCode:true,sex:true,currentWeightKg:true,
   weightRecords:{orderBy:[{recordedAt:"desc"},{createdAt:"desc"}],take:1,select:{weightKg:true,recordedAt:true}},
 },orderBy:{internalCode:"asc"},take:1500});
 const readable=animals.map(a=>({id:a.id,farmId:a.farmId,code:a.internalCode,sex:a.sex,
   weightKg:(a.weightRecords[0]?.weightKg||a.currentWeightKg)?.toString()||null,
   weightDate:a.weightRecords[0]?.recordedAt.toISOString().slice(0,10)||null}));
 return <SalesClient farms={farms} animals={readable} canEdit={ctx.membership.role!=="ACCOUNTING"}/>;
}
