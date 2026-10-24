import {z} from "zod";
export const PURPOSES=["CRIA","ENGORDE","LECHERIA","DOBLE_PROPOSITO","AGRICULTURA","AGROPECUARIA","OTRO"] as const;
export const setupSchema=z.object({
 vision:z.string().trim().min(10).max(1800),
 name:z.string().trim().min(3).max(120),
 location:z.string().trim().min(3).max(160),
 hectares:z.number().positive().max(10_000_000).nullable(),
 purpose:z.enum(PURPOSES),
 herd:z.string().trim().max(900),
 land:z.string().trim().max(900),
 goals:z.string().trim().min(5).max(900),
});
export type SetupAnswers=z.infer<typeof setupSchema>;
export type SetupStep="vision"|"name"|"location"|"hectares"|"purpose"|"herd"|"land"|"goals"|"review"|"done";
export const ORDER:SetupStep[]=["vision","name","location","hectares","purpose","herd","land","goals"];
export const QUESTIONS:Record<SetupStep,string>={
 vision:"Cuéntame cómo trabajas o qué quieres lograr con tu finca. Puedes escribir con tus propias palabras.",
 name:"¿Cómo se llama tu finca? Escribe el nombre que quieres utilizar.",
 location:"¿En qué estado, municipio o localidad queda tu finca?",
 hectares:"¿Cuántas hectáreas tiene? Si todavía no conoces la superficie, escribe «No sé».",
 purpose:"¿Tu actividad principal es cría, engorde, leche, doble propósito (carne y leche), agricultura o una combinación agropecuaria?",
 herd:"¿Qué animales tienes y aproximadamente cuántos hay de cada categoría? Si aún no los registras, escribe «Pendiente».",
 land:"Cuéntame sobre potreros, pastos, agua, instalaciones y maquinaria. Puedes dejarlo pendiente.",
 goals:"¿Qué te gustaría controlar o mejorar primero: reproducción, pesajes, sanidad, costos, ventas, potreros u otras tareas?",
 review:"Revisa la propuesta y aprueba la creación cuando estés conforme.",
 done:"La finca ya quedó registrada.",
};
const clean=(s:string)=>s.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
export function purposeFromText(text:string):SetupAnswers["purpose"]|null {
 const t=clean(text);
 if(/\b(doble proposito|carne y leche|leche y carne)\b/.test(t))return"DOBLE_PROPOSITO";
 if(/\b(agropecuaria|ganado y cultivo|cultivo y ganado|agricultura y ganado)\b/.test(t))return"AGROPECUARIA";
 if(/\b(lecheria|lechera|produccion de leche|leche|ordeno)\b/.test(t))return"LECHERIA";
 if(/\b(engorde|ceba|levante)\b/.test(t))return"ENGORDE";
 if(/\b(cria|reproduccion|vientres|becerros)\b/.test(t))return"CRIA";
 if(/\b(agricultura|cultivos|siembra|cosecha)\b/.test(t))return"AGRICULTURA";
 return null;
}
export function parseReply(step:SetupStep,message:string):unknown {
 const m=message.trim();
 if(step==="hectares"){
  if(/^(no se|no lo se|pendiente|desconozco|aun no se)$/i.test(clean(m)))return null;
  const match=clean(m).match(/^([\d.,\s]+)\s*(?:hectareas|ha)?$/);
  if(!match)return undefined;
  const raw=match[1].replace(/\s/g,"");
  const n=Number(raw.replace(",","."));return Number.isFinite(n)&&n>0&&n<=10_000_000?n:undefined;
 }
 if(step==="purpose")return purposeFromText(m)||undefined;
 if(step==="vision")return m.length>=10&&m.length<=1800?m:undefined;
 if(step==="name")return m.length>=3&&m.length<=120?m:undefined;
 if(step==="location")return m.length>=3&&m.length<=160?m:undefined;
 if(step==="goals")return m.length>=5&&m.length<=900?m:undefined;
 if(step==="herd"||step==="land")return m.length<=900?m:undefined;
 return undefined;
}
export function plan(answers:SetupAnswers){
 const modules=["Inventario ganadero","Sanidad","Jornadas","ERP administrativo","Inventario y activos","Finanzas","Mapa y potreros"];
 const rec=["Registra primero los animales reales por identificación; no se crearán animales ficticios.","Revisa los permisos y datos legales antes de iniciar movilizaciones o ventas."];
 const future:string[]=[];
 if(["CRIA","DOBLE_PROPOSITO","AGROPECUARIA"].includes(answers.purpose))rec.push("Prioriza la reproducción, genealogía, control de vientres y nacimientos.");
 if(["ENGORDE","DOBLE_PROPOSITO"].includes(answers.purpose))rec.push("Configura pesajes periódicos y seguimiento de ganancia diaria antes de planificar ventas.");
 if(["LECHERIA","DOBLE_PROPOSITO","AGROPECUARIA"].includes(answers.purpose))future.push("Producción y venta diaria de leche (módulo en desarrollo posterior)");
 if(answers.purpose==="AGRICULTURA")future.push("Producción agrícola especializada (todavía no disponible)");
 const warnings=["El propósito productivo es una configuración, no un certificado técnico o sanitario.","La capacidad de carga animal requiere evaluar forraje, disponibilidad de agua y estacionalidad."];
 if(answers.hectares===null)warnings.push("Superficie no confirmada; completa el dato posteriormente.");
 return {purpose:answers.purpose,modules,recommendations:rec,futureModules:future,warnings};
}
