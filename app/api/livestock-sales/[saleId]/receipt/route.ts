import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { get } from "@vercel/blob";
import { getCurrentTenant } from "@/lib/auth/session";
import { loadSale } from "@/server/services/livestock-sale-service";
export const runtime="nodejs";export const dynamic="force-dynamic";
type Params={params:Promise<{saleId:string}>};
export async function GET(_:Request,{params}:Params){
 const ctx=await getCurrentTenant();if(!ctx)return new Response("Sin sesión",{status:401});
 const sale=await loadSale(ctx,(await params).saleId);if(!sale)return new Response("No encontrado",{status:404});
 const pdf=await PDFDocument.create();
 const body=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const width=595,height=842;let page=pdf.addPage([width,height]),y=800;
 const clean=(v:string)=>v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^\x20-\x7E]/g," ").slice(0,130);
 const text=(v:string,x=43,size=10,isBold=false)=>{
  if(y<62){page=pdf.addPage([width,height]);y=790;}
  page.drawText(clean(v),{x,y,size,font:isBold?bold:body,color:rgb(.12,.2,.15),maxWidth:width-x-40});
  y-=size+8;
 };
 // Include the authenticated farm logo only when its metadata matches the farm and tenant.
 if(sale.farm.logoFileId){
  try{
   const {prisma}=await import("@/lib/db/prisma");
   const file=await prisma.fileStorage.findFirst({where:{id:sale.farm.logoFileId,tenantId:ctx.tenant.id,usage:"FARM_LOGO",visibility:"PRIVATE"}});
   if(file&&file.path.startsWith("agrolynk/tenants/"+ctx.tenant.id+"/private/farms/logos/")){
    const blob=await get(file.path,{access:"private",token:process.env.BLOB_READ_WRITE_TOKEN});
    if(blob?.statusCode===200){
      const imageBytes=new Uint8Array(await new Response(blob.stream).arrayBuffer());
      const image=file.mimeType==="image/png"?await pdf.embedPng(imageBytes):file.mimeType==="image/jpeg"?await pdf.embedJpg(imageBytes):null;
      if(image){const sizes=image.scale(.25);const scale=Math.min(82/sizes.width,55/sizes.height,1);page.drawImage(image,{x:470,y:755,width:sizes.width*scale,height:sizes.height*scale});}
    }
   }
  }catch{ /* Logo failure must not block document generation. */ }
 }
 text("GANADIA | "+sale.farm.name,43,16,true);
 text("COMPROBANTE INTERNO DE VENTA Y SALIDA DE GANADO",43,13,true);
 text("NO ES GUIA INSAI NI PERMISO OFICIAL DE MOVILIZACION",43,9,true);
 y-=8;
 text("Nro. "+sale.number+"       Estado: "+(sale.status==="CONFIRMED"?"VENTA CONFIRMADA":"BORRADOR"));
 text("Finca origen: "+sale.farm.name+"     "+(sale.farm.location||""));
 text("Comprador: "+sale.buyerName+"     Identificacion: "+(sale.buyerDocument||"No registrada"));
 text("Destino declarado: "+(sale.destination||"No declarado"));
 text("Fecha venta: "+sale.saleDate.toISOString().slice(0,10));
 text("Moneda: "+sale.currency+"      Precio: "+(sale.pricePerKgCents/100).toFixed(2)+" por kg");
 y-=12;
 text("DETALLE DEL GANADO ("+sale.items.length+" animales)",43,11,true);
 text("Codigo / sexo                       Peso kg       Importe        Fuente del peso",43,9,true);
 for(const item of sale.items){
  const line=item.codeSnapshot+" / "+item.sexSnapshot;
  text(line.slice(0,34).padEnd(35)+" "+Number(item.weightKg).toFixed(2).padStart(8)+"    "+(item.subtotalCents/100).toFixed(2).padStart(11));
  text("   "+(item.weightSource==="LAST_WEIGHING"?"Ultimo pesaje "+(item.lastWeighedAt?.toISOString().slice(0,10)||""):"Peso de ficha (no verificado)"),50,8);
 }
 y-=12;
 text("TOTAL: "+Number(sale.totalWeightKg).toFixed(2)+" kg      IMPORTE: "+(sale.totalCents/100).toFixed(2)+" "+sale.currency,43,12,true);
 text("Soporte INSAI: "+(sale.insaiPermitNumber||"PENDIENTE (sin guia oficial adjunta)"));
 text("Este comprobante sirve para el control interno. No autoriza la movilizacion y no sustituye factura fiscal.",43,8);
 text("La salida del inventario se efectua exclusivamente al CONFIRMAR la venta.",43,8);
 const bytes=await pdf.save();
 return new Response(new Uint8Array(bytes),{headers:{"Content-Type":"application/pdf","Content-Disposition":'attachment; filename="GanadIA-'+sale.number+'.pdf"',"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
}
