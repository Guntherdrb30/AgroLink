import { getCurrentTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { loadSale } from "@/server/services/livestock-sale-service";
import { notFound } from "next/navigation";

export const dynamic="force-dynamic";

export default async function PublicGuideVerification({params}:{params:Promise<{token:string}>}){
 const {token}=await params;
 if(!/^[a-f0-9]{64}$/.test(token))notFound();
 const sale=await prisma.livestockSale.findUnique({
  where:{verificationToken:token},
  select:{
   id:true,number:true,status:true,createdAt:true,updatedAt:true,totalWeightKg:true,
   farm:{select:{name:true}},_count:{select:{items:true}},
  },
 });
 if(!sale)notFound();
 const ctx=await getCurrentTenant();
 const authorizedSale=ctx?await loadSale(ctx,sale.id):null;
 const confirmed=sale.status==="CONFIRMED";
 return <main className="mx-auto max-w-xl space-y-5 px-4 py-8">
  <header className="rounded-3xl bg-[#1c422e] px-6 py-7 text-white">
   <p className="text-xs font-semibold tracking-[.18em] text-[#c6dfc4]">GANADIA · VERIFICACIÓN DIGITAL</p>
   <h1 className="mt-3 text-2xl font-bold">Guía interna de ganado</h1>
   <p className="mt-2 text-sm text-white/80">Documento interno de control. No es un permiso INSAI/SIGESAI ni autoriza movilización.</p>
  </header>
  <section className="space-y-4 rounded-3xl border border-[#d8e2d5] bg-white p-6">
   <p className="text-sm text-[#5b715d]">Folio</p>
   <p className="break-words text-xl font-bold text-[#1c422e]">{sale.number}</p>
   <div className="rounded-xl bg-[#edf3eb] px-4 py-3 font-semibold text-[#22523b]">
    {confirmed?"Venta interna confirmada":"Borrador pendiente de autorización"}
   </div>
   <dl className="grid grid-cols-2 gap-4 text-sm">
    <div><dt className="text-[#6a7d6c]">Finca</dt><dd className="font-semibold">{sale.farm.name}</dd></div>
    <div><dt className="text-[#6a7d6c]">Animales</dt><dd className="font-semibold">{sale._count.items}</dd></div>
    <div><dt className="text-[#6a7d6c]">Peso registrado</dt><dd className="font-semibold">{Number(sale.totalWeightKg).toLocaleString("es-VE")} kg</dd></div>
    <div><dt className="text-[#6a7d6c]">Emitida</dt><dd className="font-semibold">{sale.createdAt.toISOString().slice(0,10)}</dd></div>
   </dl>
   <p className="text-xs text-[#607561]">Esta verificación solo confirma la existencia y el estado del registro interno. No certifica requisitos sanitarios ni revela datos personales del comprador.</p>
  </section>
  {authorizedSale?
   <a className="block rounded-xl bg-[#1c422e] p-4 text-center font-semibold text-white" href={"/api/livestock-sales/"+authorizedSale.id+"/receipt?layout=premium-20261024-v2"}>Abrir documento completo PDF</a>:
   <div className="rounded-xl border p-4 text-center text-sm text-[#5b715d]">El PDF completo requiere una sesión de GanadIA con permiso de acceso a esta finca.</div>}
 </main>;
}
