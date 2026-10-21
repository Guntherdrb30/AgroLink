import {notFound} from "next/navigation";
import {getCurrentTenant} from "@/lib/auth/session";
import {prisma} from "@/lib/db/prisma";
import {FarmErpClient} from "@/components/farms/farm-erp-client";
export const dynamic="force-dynamic";
export default async function ErpFarmPage({params}:{params:Promise<{farmId:string}>}){
 const {farmId}=await params;const c=await getCurrentTenant();if(!c)notFound();
 const farm=await prisma.farm.findFirst({where:{id:farmId,tenantId:c.tenant.id},select:{id:true}});if(!farm)notFound();
 return <FarmErpClient farmId={farmId} canEdit={["TENANT_OWNER","TENANT_ADMIN","FARM_MANAGER"].includes(c.membership.role)}/>;
}