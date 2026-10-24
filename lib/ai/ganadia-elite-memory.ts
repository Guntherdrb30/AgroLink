import {prisma} from "@/lib/db/prisma";
import type {AiContext} from "@/lib/ai/ganadia-tools";
import {
 cleanMemoryText,cleanDisplayName,permittedFarm,renderMemoryForModel,
 inferUsageTopic,proposePattern,detectExplicitPreference,RESPONSE_STYLES,MEMORY_KINDS,
 MAX_PERSONAL_FACTS,MAX_COMPANY_FACTS,
 type ResponseStyle,type MemoryKind,
} from "@/lib/ai/ganadia-elite-policy";

function ids(ctx:AiContext){return {tenantId:ctx.ctx.tenant.id,userId:ctx.ctx.user.id};}
function farms(ctx:AiContext){return ctx.farms.map(f=>f.id);}
function farmGrant(ctx:AiContext,farmId:unknown){
 if(farmId===null||farmId===undefined||farmId==="")return null;
 if(typeof farmId!=="string"||!permittedFarm(farmId,farms(ctx)))throw Error("MEMORY_FARM_DENIED");
 return farmId;
}
function admin(ctx:AiContext){return ["TENANT_OWNER","TENANT_ADMIN"].includes(ctx.ctx.membership.role);}
function companyWhere(ctx:AiContext,farmId:string|null=null){
 const allow=farmId?[farmId]:farms(ctx);
 return {tenantId:ctx.ctx.tenant.id,OR:[{farmId:null},{farmId:{in:allow}}]};
}
export async function getEliteProfile(ctx:AiContext){
 const key=ids(ctx);
 const [settings,facts,company,patterns]=await Promise.all([
  prisma.ganadiaAiMemorySettings.findUnique({where:{tenantId_userId:key}}),
  prisma.ganadiaAiMemoryFact.findMany({where:{...key,OR:[{farmId:null},{farmId:{in:farms(ctx)}}]},orderBy:{updatedAt:"desc"},take:MAX_PERSONAL_FACTS}),
  prisma.ganadiaAiOrganizationMemory.findMany({where:companyWhere(ctx),orderBy:{updatedAt:"desc"},take:MAX_COMPANY_FACTS}),
  prisma.ganadiaAiUsagePattern.findMany({where:key,orderBy:{occurrences:"desc"},take:15}),
 ]);
 return {
  identity:{name:ctx.ctx.user.name||"",company:ctx.ctx.tenant.name,role:ctx.ctx.membership.role},
  settings:{enabled:settings?.enabled??false,learnFromChat:settings?.learnFromChat??false,
    preferredName:settings?.preferredName??null,responseStyle:settings?.responseStyle??"BALANCED"},
  facts:facts.map(f=>({id:f.id,farmId:f.farmId,kind:f.kind,content:f.content,status:f.status,origin:f.origin,evidenceCount:f.evidenceCount,createdAt:f.createdAt.toISOString()})),
  organization:company.map(f=>({id:f.id,farmId:f.farmId,content:f.content,createdAt:f.createdAt.toISOString()})),
  patterns:patterns.map(p=>({topic:p.patternKey,occurrences:p.occurrences,activeDays:p.activeDays})),
  farms:ctx.farms,canManageCompany:admin(ctx),
 };
}
export async function updateEliteSettings(ctx:AiContext,input:unknown){
 if(!input||typeof input!=="object"||Array.isArray(input))throw Error("MEMORY_BAD_REQUEST");
 const v=input as Record<string,unknown>;
 const allowed=["enabled","learnFromChat","preferredName","responseStyle"];
 if(Object.keys(v).some(k=>!allowed.includes(k)))throw Error("MEMORY_BAD_REQUEST");
 if(typeof v.enabled!=="boolean"||typeof v.learnFromChat!=="boolean"||v.learnFromChat&&!v.enabled)
  throw Error("MEMORY_BAD_REQUEST");
 if(!RESPONSE_STYLES.includes(v.responseStyle as ResponseStyle))throw Error("MEMORY_BAD_REQUEST");
 const preferredName=cleanDisplayName(v.preferredName);
 const data={enabled:v.enabled,learnFromChat:v.learnFromChat,preferredName,responseStyle:v.responseStyle as ResponseStyle};
 await prisma.ganadiaAiMemorySettings.upsert({
  where:{tenantId_userId:ids(ctx)},create:{...ids(ctx),...data},update:data,
 });
 return data;
}
async function mustBeEnabled(ctx:AiContext){
 const settings=await prisma.ganadiaAiMemorySettings.findUnique({where:{tenantId_userId:ids(ctx)},select:{enabled:true}});
 if(!settings?.enabled)throw Error("MEMORY_DISABLED");
}
export async function createEliteFact(ctx:AiContext,input:unknown){
 await mustBeEnabled(ctx);
 if(!input||typeof input!=="object"||Array.isArray(input))throw Error("MEMORY_BAD_REQUEST");
 const v=input as Record<string,unknown>;
 if(!MEMORY_KINDS.includes(v.kind as MemoryKind))throw Error("MEMORY_BAD_REQUEST");
 const content=cleanMemoryText(v.content);
 const farmId=farmGrant(ctx,v.farmId);
 const existing=await prisma.ganadiaAiMemoryFact.findFirst({where:{...ids(ctx),content,kind:v.kind as string,farmId}});
 if(existing)return existing;
 const count=await prisma.ganadiaAiMemoryFact.count({where:ids(ctx)});
 if(count>=MAX_PERSONAL_FACTS)throw Error("MEMORY_LIMIT_REACHED");
 return prisma.ganadiaAiMemoryFact.create({data:{
  ...ids(ctx),farmId,kind:v.kind as string,content,status:"ACTIVE",origin:"MANUAL",
 }});
}
export async function reviseEliteFact(ctx:AiContext,id:string,input:unknown){
 if(!input||typeof input!=="object"||Array.isArray(input))throw Error("MEMORY_BAD_REQUEST");
 const v=input as Record<string,unknown>;
 const keys=Object.keys(v);
 if(!keys.length||keys.some(k=>!["content","status","kind"].includes(k)))throw Error("MEMORY_BAD_REQUEST");
 const data:{content?:string;status?:string;kind?:string}={};
 if("content" in v)data.content=cleanMemoryText(v.content);
 if("kind" in v){if(!MEMORY_KINDS.includes(v.kind as MemoryKind))throw Error("MEMORY_BAD_REQUEST");data.kind=v.kind as string;}
 if("status" in v){if(!["ACTIVE","DISMISSED","SUGGESTED"].includes(String(v.status)))throw Error("MEMORY_BAD_REQUEST");data.status=String(v.status);}
 const match=await prisma.ganadiaAiMemoryFact.findFirst({where:{...ids(ctx),id,OR:[{farmId:null},{farmId:{in:farms(ctx)}}]},select:{id:true}});
 if(!match)throw Error("MEMORY_NOT_FOUND");
 const updated=await prisma.ganadiaAiMemoryFact.updateMany({where:{...ids(ctx),id},data});
 if(updated.count!==1)throw Error("MEMORY_NOT_FOUND");
 return {ok:true};
}
export async function deleteEliteFact(ctx:AiContext,id:string){
 const count=await prisma.ganadiaAiMemoryFact.deleteMany({where:{...ids(ctx),id,OR:[{farmId:null},{farmId:{in:farms(ctx)}}]}});
 if(!count.count)throw Error("MEMORY_NOT_FOUND");return {ok:true};
}
export async function eraseElitePersonalMemory(ctx:AiContext,confirm:string){
 if(confirm!=="BORRAR_TODA_MI_MEMORIA")throw Error("MEMORY_CONFIRMATION_REQUIRED");
 const key=ids(ctx);
 await prisma.$transaction(async tx=>{
  await tx.ganadiaAiMemoryFact.deleteMany({where:key});
  await tx.ganadiaAiUsagePattern.deleteMany({where:key});
  await tx.ganadiaAiMemorySettings.upsert({where:{tenantId_userId:key},
   create:{...key,enabled:false,learnFromChat:false},
   update:{enabled:false,learnFromChat:false,preferredName:null,responseStyle:"BALANCED"}});
 },{maxWait:10_000,timeout:15_000});
 return {ok:true};
}
export async function createCompanyMemory(ctx:AiContext,input:unknown){
 if(!admin(ctx))throw Error("MEMORY_ROLE_DENIED");
 if(!input||typeof input!=="object"||Array.isArray(input))throw Error("MEMORY_BAD_REQUEST");
 const v=input as Record<string,unknown>;
 const content=cleanMemoryText(v.content);
 const farmId=farmGrant(ctx,v.farmId);
 if(await prisma.ganadiaAiOrganizationMemory.count({where:{tenantId:ctx.ctx.tenant.id}})>=MAX_COMPANY_FACTS)
  throw Error("MEMORY_LIMIT_REACHED");
 return prisma.ganadiaAiOrganizationMemory.create({data:{tenantId:ctx.ctx.tenant.id,farmId,content,createdById:ctx.ctx.user.id}});
}
export async function modifyCompanyMemory(ctx:AiContext,id:string,input:unknown){
 if(!admin(ctx))throw Error("MEMORY_ROLE_DENIED");
 if(!input||typeof input!=="object"||Array.isArray(input))throw Error("MEMORY_BAD_REQUEST");
 const v=input as Record<string,unknown>;
 if(Object.keys(v).some(k=>k!=="content")||!Object.keys(v).length)throw Error("MEMORY_BAD_REQUEST");
 const content=cleanMemoryText(v.content);
 const changed=await prisma.ganadiaAiOrganizationMemory.updateMany({where:{tenantId:ctx.ctx.tenant.id,id,OR:[{farmId:null},{farmId:{in:farms(ctx)}}]},data:{content}});
 if(changed.count!==1)throw Error("MEMORY_NOT_FOUND");
 return {ok:true};
}
export async function deleteCompanyMemory(ctx:AiContext,id:string){
 if(!admin(ctx))throw Error("MEMORY_ROLE_DENIED");
 const deleted=await prisma.ganadiaAiOrganizationMemory.deleteMany({where:{tenantId:ctx.ctx.tenant.id,id,OR:[{farmId:null},{farmId:{in:farms(ctx)}}]}});
 if(!deleted.count)throw Error("MEMORY_NOT_FOUND");return {ok:true};
}
/** Read-only prompt context. Never trust personal/organization memory as authoritative facts. */
export async function getEliteModelContext(ctx:AiContext,farmId:string|null):Promise<string>{
 const key=ids(ctx);
 const baseName=(ctx.ctx.user.name||"").trim().split(/\s+/)[0]||null;
 const pref=await prisma.ganadiaAiMemorySettings.findUnique({where:{tenantId_userId:key}});
 const display=pref?.enabled?pref.preferredName||baseName:baseName;
 if(!pref?.enabled)return renderMemoryForModel({firstName:display,companyName:ctx.ctx.tenant.name,style:"BALANCED",memories:[],companyMemories:[]});
 const permitted=farms(ctx);
 const filteredFarm=farmId&&permitted.includes(farmId)?[farmId]:permitted;
 const [facts,org]=await Promise.all([
  prisma.ganadiaAiMemoryFact.findMany({where:{...key,status:"ACTIVE",OR:[{farmId:null},{farmId:{in:filteredFarm}}]},take:10,orderBy:{updatedAt:"desc"},select:{kind:true,content:true,farmId:true}}),
  prisma.ganadiaAiOrganizationMemory.findMany({where:{tenantId:key.tenantId,OR:[{farmId:null},{farmId:{in:filteredFarm}}]},orderBy:{updatedAt:"desc"},take:5,select:{content:true}}),
 ]);
 const safeFacts=facts.filter(f=>!f.farmId||permitted.includes(f.farmId));
 return renderMemoryForModel({firstName:display,companyName:ctx.ctx.tenant.name,
  style:RESPONSE_STYLES.includes(pref.responseStyle as ResponseStyle)?pref.responseStyle as ResponseStyle:"BALANCED",
  memories:safeFacts,companyMemories:org});
}
/** No raw chat copied. Only a bounded category counter, opt-in. */
export async function observeEliteUsage(ctx:AiContext,message:string):Promise<void>{
 const key=ids(ctx);
 const setting=await prisma.ganadiaAiMemorySettings.findUnique({where:{tenantId_userId:key}});
 if(!setting?.enabled||!setting.learnFromChat)return;
 const topic=inferUsageTopic(message);
 const day=new Date().toISOString().slice(0,10);
 if(topic!=="otros"){
  let p=await prisma.ganadiaAiUsagePattern.upsert({
   where:{tenantId_userId_patternKey:{...key,patternKey:topic}},
   create:{...key,patternKey:topic,occurrences:1,activeDays:1,lastDay:day},
   update:{occurrences:{increment:1}},
  });
  if(p.lastDay!==day){
   const touched=await prisma.ganadiaAiUsagePattern.updateMany({
    where:{id:p.id,lastDay:{not:day}},data:{lastDay:day,activeDays:{increment:1}},
   });
   if(touched.count)p={...p,activeDays:p.activeDays+1,lastDay:day};
  }
  const suggestion=proposePattern(topic,p.occurrences,p.activeDays);
  if(suggestion)await suggestEliteFact(ctx,"INTEREST",suggestion,"PATTERN",p.occurrences);
 }
 const explicit=detectExplicitPreference(message);
 if(explicit)await suggestEliteFact(ctx,explicit.kind,explicit.content,"EXPLICIT",1);
}
export async function suggestEliteFact(ctx:AiContext,kind:MemoryKind,content:string,origin:"EXPLICIT"|"PATTERN"|"OPENAI",evidenceCount=1){
 const setting=await prisma.ganadiaAiMemorySettings.findUnique({where:{tenantId_userId:ids(ctx)},select:{enabled:true,learnFromChat:true}});
 if(!setting?.enabled||!setting.learnFromChat)return;
 const text=cleanMemoryText(content);
 if(await prisma.ganadiaAiMemoryFact.findFirst({where:{...ids(ctx),kind,content:text}}))return;
 if(await prisma.ganadiaAiMemoryFact.count({where:ids(ctx)})>=MAX_PERSONAL_FACTS)return;
 await prisma.ganadiaAiMemoryFact.create({data:{...ids(ctx),farmId:null,kind,content:text,status:"SUGGESTED",origin,evidenceCount}});
}
