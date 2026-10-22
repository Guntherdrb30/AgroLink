import {notFound} from "next/navigation";
import {requireFarmPermission} from "@/lib/permissions/farm-access";
import {prisma} from "@/lib/db/prisma";
import {FarmErpClient} from "@/components/farms/farm-erp-client";
export const dynamic="force-dynamic";
export default async function ErpFarmPage({params}:{params:Promise<{farmId:string}>}){
 const {farmId}=await params;const access=await requireFarmPermission(farmId,"finance");if(!access)notFound();const c=access.ctx;
 const farm=await prisma.farm.findFirst({where:{id:farmId,tenantId:c.tenant.id},select:{id:true}});if(!farm)notFound();
 return <FarmErpClient farmId={farmId} canEdit={["TENANT_OWNER","TENANT_ADMIN"].includes(c.membership.role)} financeOnly={c.membership.role==="ACCOUNTING"}/>;
}