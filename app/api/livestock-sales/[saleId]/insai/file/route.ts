import { get } from "@vercel/blob";
import { getCurrentTenant } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { loadSale } from "@/server/services/livestock-sale-service";
export const dynamic="force-dynamic";export const runtime="nodejs";
type Context={params:Promise<{saleId:string}>};
export async function GET(_:Request,{params}:Context){
 const ctx=await getCurrentTenant();if(!ctx)return new Response("Sin sesión",{status:401});
 const sale=await loadSale(ctx,(await params).saleId);
 if(!sale?.insaiPermitFileId)return new Response("Sin soporte",{status:404});
 const file=await prisma.fileStorage.findFirst({where:{
  id:sale.insaiPermitFileId,tenantId:ctx.tenant.id,entityType:"livestock_sale",
  entityId:sale.id,usage:"SALE_PERMIT",visibility:"PRIVATE",
 }});
 if(!file||!file.path.startsWith("agrolynk/tenants/"+ctx.tenant.id+"/private/sales/insai-permits/"))return new Response("No encontrado",{status:404});
 try{
  const blob=await get(file.path,{access:"private",token:process.env.BLOB_READ_WRITE_TOKEN});
  if(!blob||blob.statusCode!==200)return new Response("No disponible",{status:404});
  const safeName=file.originalName.replace(/[\r\n"\\]/g,"_").slice(0,120);
  return new Response(blob.stream,{headers:{
    "Content-Type":["application/pdf","image/jpeg","image/png","image/webp"].includes(file.mimeType)?file.mimeType:"application/octet-stream",
    "Content-Disposition":'attachment; filename="'+safeName+'"',
    "Cache-Control":"private, no-store",
    "Content-Security-Policy":"sandbox",
    "X-Content-Type-Options":"nosniff",
  }});
 }catch{return new Response("Almacenamiento temporalmente indisponible",{status:503});}
}
