import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import { get } from "@vercel/blob";
import { qrcodegen } from "@/lib/qr/qrcodegen";
import { prisma } from "@/lib/db/prisma";
import { getCurrentTenant } from "@/lib/auth/session";
import { loadSale } from "@/server/services/livestock-sale-service";
export const runtime="nodejs";export const dynamic="force-dynamic";
type Params={params:Promise<{saleId:string}>};
const GREEN=rgb(.10,.26,.18),MUTED=rgb(.34,.43,.37),PALE=rgb(.94,.97,.94),BORDER=rgb(.83,.88,.83),WHITE=rgb(1,1,1);
export async function GET(request:Request,{params}:Params){
 const ctx=await getCurrentTenant();if(!ctx)return new Response("Sin sesión",{status:401});
 const sale=await loadSale(ctx,(await params).saleId);if(!sale)return new Response("No encontrado",{status:404});
 const info=(sale.guideData&&typeof sale.guideData==="object"&&!Array.isArray(sale.guideData))?sale.guideData as Record<string,string>:{};
 const doc=await PDFDocument.create(), regular=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
 const W=595,H=842;let page=doc.addPage([W,H]),y=H-36,pageNum=1;
 function clean(v:unknown){return String(v??"Pendiente").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[\x00-\x1f]/g," ").slice(0,320);}
 function txt(value:unknown,x:number,yy:number,size=9,strong=false,color=MUTED,maxWidth=505){
  const font=strong?bold:regular;const line=clean(value);let out=line;
  while(font.widthOfTextAtSize(out,size)>maxWidth&&out.length>1)out=out.slice(0,-2)+"…";
  page.drawText(out.replace(/…/g,"..."),{x,y:yy,font,size,color,maxWidth});
 }
 function bar(name:string){if(y<105)next();page.drawRectangle({x:34,y:y-22,width:527,height:25,color:GREEN});txt(name,45,y-14,10,true,WHITE,500);y-=34;}
 function pair(a:string,b:unknown,x=44,width=245){txt(a+":",x,y,7,true,GREEN,width);txt(b,x,y-13,9,false,MUTED,width);y-=34;}
 function duo(a:string,b:unknown,c:string,d:unknown){const line=y;pair(a,b,44,245);y=line;pair(c,d,311,240);}
 function smallNote(v:string){txt(v,43,y,7,false,MUTED,510);y-=13;}
 function next(){page=doc.addPage([W,H]);pageNum++;y=H-34;page.drawRectangle({x:0,y:H-10,width:W,height:10,color:GREEN});txt("GanadIA · Guia Interna de Movilizacion y Venta",38,H-28,9,true,GREEN);y-=32;}
 function footer(){page.drawLine({start:{x:35,y:34},end:{x:560,y:34},thickness:.7,color:BORDER});txt("CONTROL INTERNO | NO ES GUIA OFICIAL INSAI / SIGESAI",38,22,7,true,MUTED);txt("Pagina "+pageNum,512,22,7,false,MUTED);}
 function grid(fields:Array<[string,string]>,cols=2){
  for(let i=0;i<fields.length;i+=cols){if(y<100)next();if(cols===2&&fields[i+1])duo(fields[i][0],fields[i][1],fields[i+1][0],fields[i+1][1]);else pair(fields[i][0],fields[i][1]);}
 }
 // Private company imagery: only verified, tenant-owned farm assets.
 for(const asset of [
  {id:sale.farm.logoFileId,usage:"FARM_LOGO",segment:"farms/logos",x:176},
  {id:sale.farm.ironFileId,usage:"FARM_IRON",segment:"farms/irons",x:409},
 ]){
  if(!asset.id)continue;
  try{
   const stored=await prisma.fileStorage.findFirst({where:{id:asset.id,tenantId:ctx.tenant.id,usage:asset.usage as "FARM_LOGO"|"FARM_IRON",visibility:"PRIVATE"}});
   if(!stored||!stored.path.startsWith("agrolynk/tenants/"+ctx.tenant.id+"/private/"+asset.segment+"/"))continue;
   const blob=await get(stored.path,{access:"private",token:process.env.BLOB_READ_WRITE_TOKEN});
   if(!blob||blob.statusCode!==200)continue;
   const bytes=new Uint8Array(await new Response(blob.stream).arrayBuffer());
   const img=stored.mimeType==="image/png"?await doc.embedPng(bytes):stored.mimeType==="image/jpeg"?await doc.embedJpg(bytes):null;
   if(!img)continue;
   const scaled=img.scale(1);const ratio=Math.min(63/scaled.width,55/scaled.height);
   page.drawImage(img,{x:asset.x,y:770,width:scaled.width*ratio,height:scaled.height*ratio});
  }catch{/* An invalid farm logo must not prevent the guide PDF. */}
 }
 // Header and official-document separation.
 page.drawRectangle({x:0,y:H-10,width:W,height:10,color:GREEN});
 txt("GanadIA",35,798,25,true,GREEN,180);txt("TECNOLOGIA GANADERA",36,780,8,false,MUTED);
 txt(sale.farm.name,235,803,13,true,GREEN,192);
 txt("Hierro: "+(info.farmIron||sale.farm.ironCode||"Por registrar"),235,785,8,false,MUTED,190);
 txt("N° "+sale.number,34,754,12,true,GREEN,440);
 page.drawRectangle({x:33,y:714,width:526,height:24,color:PALE,borderColor:BORDER,borderWidth:.7});
 txt(sale.status==="CONFIRMED"?"VENTA CONFIRMADA":"BORRADOR PENDIENTE DE AUTORIZACION",43,722,9,true,GREEN);
 txt("GUIA INTERNA DE MOVILIZACION Y VENTA DE GANADO",34,684,16,true,GREEN,520);
 txt("Documento interno. No autoriza movilizacion ni sustituye al INSAI/SIGESAI o factura fiscal.",35,668,7,false,MUTED,523);
 // QR with restricted, authenticated digital verification.
 if(sale.verificationToken){
  const uri=new URL("/guias/verificar/"+sale.verificationToken,request.url).toString();
  const code=qrcodegen.QrCode.encodeText(uri,qrcodegen.QrCode.Ecc.MEDIUM);
  const size=78,cell=size/(code.size+8),left=472,top=815;
  page.drawRectangle({x:left-2,y:top-size-2,width:size+4,height:size+4,color:WHITE});
  for(let row=0;row<code.size;row++)for(let col=0;col<code.size;col++){
   if(code.getModule(col,row)){page.drawRectangle({x:left+(col+4)*cell,y:top-(row+5)*cell,width:cell+.05,height:cell+.05,color:GREEN});}
  }
  txt("QR digital privado",466,724,7,false,MUTED,102);
 }
 y=642;
 bar("1. DATOS DEL EMISOR Y FINCA DE ORIGEN");
 grid([["Finca",sale.farm.name],["Propietario / razon social",info.originOwner||"Pendiente"],["RIF / cedula",info.originDocument||"Pendiente"],["Hierro registrado",info.farmIron||sale.farm.ironCode||"Pendiente"],["Direccion",info.originAddress||sale.farm.location||"Pendiente"],["Contacto",info.originPhone||"Pendiente"]]);
 bar("2. DATOS DEL COMPRADOR Y DESTINATARIO");
 grid([["Cliente",sale.buyerName],["RIF / cedula",sale.buyerDocument||"Pendiente"],["Direccion fiscal",info.buyerAddress||"Pendiente"],["Telefono",info.buyerPhone||"Pendiente"],["Correo",info.buyerEmail||"Pendiente"],["Persona de contacto",info.buyerContact||"Pendiente"]]);
 bar("3. MOVILIZACION PREVISTA");
 grid([["Origen",sale.farm.name],["Destino",info.destinationAddress||sale.destination||"Pendiente"],["Motivo",info.movementPurpose||"Venta de ganado"],["Fecha / hora",((info.plannedDeparture||"Pendiente")+" "+(info.plannedTime||""))],["Ruta",info.route||"Pendiente"],["Vehiculo / placa",(info.vehicle||"Pendiente")+" / "+(info.vehiclePlate||"Pendiente")],["Conductor",info.driverName||"Pendiente"],["Cedula del conductor",info.driverDocument||"Pendiente"]]);
 if(y<165)next();
 bar("4. RESUMEN DEL GANADO");
 const count=sale.items.length,weight=Number(sale.totalWeightKg);
 grid([["Cantidad",count+" animales"],["Peso registrado",weight.toLocaleString("es-VE")+" kg"],["Peso promedio",(count?weight/count:0).toFixed(2)+" kg"],["Fecha documento",sale.createdAt.toISOString().slice(0,10)]]);
 if(y<190)next();bar("5. DETALLE INDIVIDUAL");
 const rowH=17;
 function tableHead(){
  page.drawRectangle({x:35,y:y-20,width:525,height:22,color:PALE});
  txt("CODIGO",43,y-14,8,true,GREEN,142);txt("SEXO",193,y-14,8,true,GREEN,68);
  txt("PESO (KG)",265,y-14,8,true,GREEN,95);txt("ULTIMO PESAJE",368,y-14,8,true,GREEN,100);txt("FUENTE",475,y-14,8,true,GREEN,80);y-=27;
 }
 tableHead();
 for(const item of sale.items){
  if(y<91){footer();next();tableHead();}
  txt(item.codeSnapshot,43,y,8,false,MUTED,142);
  txt(item.sexSnapshot,193,y,8,false,MUTED,68);
  txt(Number(item.weightKg).toFixed(2),265,y,8,false,MUTED,95);
  txt(item.lastWeighedAt?item.lastWeighedAt.toISOString().slice(0,10):"Sin fecha",368,y,8,false,MUTED,100);
  txt(item.weightSource==="LAST_WEIGHING"?"Pesaje":"Ficha",475,y,8,false,MUTED,77);
  page.drawLine({start:{x:38,y:y-5},end:{x:558,y:y-5},thickness:.4,color:BORDER});y-=rowH;
 }
 if(y<215){footer();next();}
 y-=9;bar("6. SOPORTES SANITARIOS");
 grid([["Observaciones sanitarias",info.healthNotes||"Pendiente de revision"],["Guia oficial INSAI",sale.insaiPermitNumber||"Pendiente de adjuntar"]]);
 if(y<200){footer();next();}
 bar("7. DATOS ECONOMICOS");
 grid([["Precio por kilogramo",sale.currency+" "+(sale.pricePerKgCents/100).toFixed(2)],["Total interno",sale.currency+" "+(sale.totalCents/100).toFixed(2)],["Condiciones de pago",info.paymentTerms||"Por definir"],["Responsable",info.responsibleName||"Por registrar"]]);
 if(y<180){footer();next();}
 bar("8. RESPONSABLES Y VALIDACIONES");
 txt("Elaborado por: _________________________",44,y,9);txt("Autorizado por: _________________________",309,y,9);y-=30;
 txt("Entrega: ______________________________",44,y,9);txt("Recibe: ________________________________",309,y,9);y-=28;
 smallNote("La salida del inventario solo ocurre al CONFIRMAR la venta en GanadIA.");
 smallNote("El QR abre un registro digital autenticado para usuarios con permiso sobre la finca.");
 footer();
 const bytes=await doc.save();
 return new Response(new Uint8Array(bytes),{headers:{"Content-Type":"application/pdf","Content-Disposition":'attachment; filename="GanadIA-'+sale.number+'.pdf"',"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
}