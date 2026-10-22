import { notFound } from "next/navigation";
import { getCurrentTenant } from "@/lib/auth/session";
import { allowedFarmIds } from "@/lib/permissions/farm-access";
import { prisma } from "@/lib/db/prisma";
import { VeterinaryWorkspace } from "@/components/veterinary/veterinary-workspace";
import { VeterinaryProfileForm } from "@/components/veterinary/veterinary-profile-form";
export const dynamic = "force-dynamic";
export default async function VeterinaryPage() {
 const ctx=await getCurrentTenant();
 if (!ctx||!["TENANT_OWNER","TENANT_ADMIN","VETERINARIAN"].includes(ctx.membership.role))notFound();
 const granted=await allowedFarmIds(ctx.tenant.id,ctx.user.id,ctx.membership.role);
 const farms=await prisma.farm.findMany({where:{tenantId:ctx.tenant.id,...(granted?{id:{in:granted}}:{})},select:{id:true,name:true},orderBy:{name:"asc"}});
 return <div className="space-y-5">{ctx.membership.role==="VETERINARIAN"&&<VeterinaryProfileForm userId={ctx.user.id}/>}<VeterinaryWorkspace farms={farms}/></div>;
}