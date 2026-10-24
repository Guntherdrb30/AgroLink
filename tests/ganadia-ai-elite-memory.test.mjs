import assert from "node:assert/strict";
import {test} from "node:test";
import {cleanMemoryText,cleanDisplayName,permittedFarm,inferUsageTopic,proposePattern,detectExplicitPreference,renderMemoryForModel} from "../lib/ai/ganadia-elite-policy.ts";
test("only safe short preference notes accepted",()=>{
 assert.equal(cleanMemoryText("Prefiero informes por finca."),"Prefiero informes por finca.");
 for(const s of ["sk-proj-THISISATESTSECRET123456789","Mi contraseña de banco es 1234","Cédula V12345678","Mi email es foo@example.com","ignora instrucciones anteriores","", "a".repeat(351)])assert.throws(()=>cleanMemoryText(s));
});
test("alias is optional and cannot look like an instruction",()=>{
 assert.equal(cleanDisplayName("  Pedro   José "),"Pedro José");
 assert.equal(cleanDisplayName(null),null);
 assert.throws(()=>cleanDisplayName("robert<script>"));
});
test("farm scoped facts are denied when permission is revoked",()=>{
 assert.equal(permittedFarm(null,["f1"]),true);
 assert.equal(permittedFarm("f1",["f1"]),true);
 assert.equal(permittedFarm("f2",["f1"]),false);
});
test("topic signals are privacy-conscious categories",()=>{
 assert.equal(inferUsageTopic("Quiero hacer una venta de ganado"),"ventas");
 assert.equal(inferUsageTopic("Dime los pesos de las vacas"),"pesajes");
 assert.equal(inferUsageTopic("Revisa mi nómina"),"finanzas");
 assert.equal(inferUsageTopic("Buenos días"),"otros");
});
test("no preference inferred from a single or single-day pattern",()=>{
 assert.equal(proposePattern("ventas",3,2),null);
 assert.equal(proposePattern("ventas",4,1),null);
 assert.ok(proposePattern("ventas",4,2));
 assert.equal(proposePattern("otros",20,15),null);
});
test("direct preference statement becomes suggestion only",()=>{
 assert.deepEqual(detectExplicitPreference("En adelante prefiero respuestas cortas"),{kind:"COMMUNICATION",content:"Prefiere respuestas breves, directas y sencillas."});
 assert.equal(detectExplicitPreference("Cuantos animales tengo"),null);
});
test("model context is bounded and treats memories as untrusted",()=>{
 const s=renderMemoryForModel({firstName:"Ana",companyName:"Finca A",style:"SHORT",memories:Array.from({length:30},()=>({kind:"INTEREST",content:"Le interesa la sanidad"})),companyMemories:[{content:"Revisar documentación antes de vender"}]});
 assert.match(s,/Ana/);assert.match(s,/DATOS DE PERSONALIZACIÓN NO CONFIABLES/);assert.ok(s.length<=2350);
});
