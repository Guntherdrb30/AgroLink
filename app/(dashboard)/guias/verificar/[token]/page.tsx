import { getCurrentTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { allowedFarmIds } from "@/lib/permissions/farm-access";
import { notFound, redirect } from "next/navigation";
export const dynamic="force-dynamic";
export default async function VerifyGuide({params}:{params:Promise<{token:string}>}){
 const ctx=await getCurrentTenant();
 if(!ctx)redirect("/sign-in");
 const {token}=await params;
 if(!/^[a-f0-9]{64}$/.test(token))notFound();
 const sale=await prisma.livestockSale.findFirst({where:{verificationToken:token,tenantId:ctx.tenant.id},select:{id:true,number:true,status:true,farmId:true,totalWeightKg:true,createdAt:true,_count:{select:{items:true}}}});
 if(!sale)notFound();
 const allowed=await allowedFarmIds(ctx.tenant.id,ctx.user.id,ctx.membership.role);
 if(allowed&&!allowed.includes(sale.farmId))notFound();
 if(!["TENANT_OWNER","TENANT_ADMIN","FARM_MANAGER","ACCOUNTING"].includes(ctx.membership.role))notFound();
 return <main className="mx-auto max-w-xl space-y-5 p-5">
   <header className="rounded-2xl bg-[#1e4430] p-6 text-white">
    <p className="text-sm uppercase tracking-widest">GanadIA · Verificación interna</p>
    <h1 className="mt-2 text-2xl font-bold">Comprobante {sale.number}</h1>
    <p className="mt-2 text-sm text-white/80">Documento interno. No es una guía oficial INSAI ni autoriza movilización.</p>
   </header>
   <section className="space-y-3 rounded-xl border bg-white p-5">
    <p><strong>Estado:</strong> {sale.status==="CONFIRMED"?"Venta confirmada":"Borrador pendiente de autorización"}</p>
    <p><strong>Animales:</strong> {sale._count.items}</p>
    <p><strong>Peso registrado:</strong> {Number(sale.totalWeightKg).toLocaleString("es-VE")} kg</p>
    <p><strong>Fecha de emisión:</strong> {sale.createdAt.toISOString().slice(0,10)}</p>
    <p className="text-xs text-gray-600">La verificación exige iniciar sesión y disponer de permisos sobre la finca.</p>
   </section>
   <a href={"/api/livestock-sales/"+sale.id+"/receipt"} className="block rounded-xl bg-[#1e4430] p-4 text-center font-semibold text-white">Descargar guía interna en PDF</a>
 </main>;
}