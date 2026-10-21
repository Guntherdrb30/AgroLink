import { notFound } from "next/navigation";
import { getCurrentTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { LivestockMovementsClient } from "@/components/farms/livestock-movements-client";
export const dynamic="force-dynamic";
export default async function FarmMovementsPage({params}:{params:Promise<{farmId:string}>}){
 const {farmId}=await params;const context=await getCurrentTenant();if(!context)notFound();
 const farm=await prisma.farm.findFirst({where:{id:farmId,tenantId:context.tenant.id},select:{id:true,name:true}});
 if(!farm)notFound();
 return <LivestockMovementsClient farmId={farmId} farmName={farm.name}
  editable={["TENANT_OWNER","TENANT_ADMIN","FARM_MANAGER"].includes(context.membership.role)}/>;
}
