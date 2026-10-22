import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getCurrentTenant } from "@/lib/auth/session";
import { allowedFarmIds } from "@/lib/permissions/farm-access";
export const dynamic="force-dynamic";
export default async function FinancePage(){
 const ctx=await getCurrentTenant();if(!ctx||!["TENANT_OWNER","TENANT_ADMIN","ACCOUNTING"].includes(ctx.membership.role))notFound();
 const ids=await allowedFarmIds(ctx.tenant.id,ctx.user.id,ctx.membership.role);
 const farms=await prisma.farm.findMany({where:{tenantId:ctx.tenant.id,...(ids?{id:{in:ids}}:{})},select:{id:true,name:true},orderBy:{name:"asc"}});
 return <div className="mx-auto max-w-4xl space-y-5"><header><p className="text-xs font-bold uppercase tracking-widest text-[#947242]">Administración autorizada</p><h1 className="mt-2 text-3xl font-bold">Finanzas por finca</h1><p className="mt-2 text-sm text-[#697b6d]">Solo los registros financieros de las fincas autorizadas. No incluye inventario animal ni operaciones de campo.</p></header>
 <div className="grid gap-3 sm:grid-cols-2">{farms.map(f=><Link href={`/farms/${encodeURIComponent(f.id)}/erp`} key={f.id} className="flex min-h-20 items-center justify-between rounded-2xl border bg-white p-5 font-bold text-[#24402c]">{f.name}<span aria-hidden="true">→</span></Link>)}</div>
 {!farms.length&&<p className="rounded-xl border bg-white p-5 text-sm">No tienes fincas asignadas. Solicita acceso al propietario.</p>}
 </div>;
}