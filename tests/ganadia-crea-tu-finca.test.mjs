import assert from "node:assert/strict";
import {test} from "node:test";
import {purposeFromText,parseReply,setupSchema,plan} from "../lib/farms/crea-tu-finca.ts";
test("doble propósito is about production, not animal gender",()=>{
 assert.equal(purposeFromText("Tengo finca de doble propósito, vacas y toros"),"DOBLE_PROPOSITO");
 assert.equal(purposeFromText("50 hembras y machos"),null);
 assert.equal(purposeFromText("Cultivo y ganado"),"AGROPECUARIA");
});
test("hectares are never inferred from free-form herd quantities",()=>{
 assert.equal(parseReply("hectares","200 ha"),200);
 assert.equal(parseReply("hectares","No sé"),null);
 assert.equal(parseReply("hectares","200 vacas"),undefined);
});
test("no phantom animal or milk production modules",()=>{
 const a={vision:"Una finca de doble propósito con ganado",name:"Finca La Esperanza",location:"Barinas",hectares:200,purpose:"DOBLE_PROPOSITO",herd:"40 vacas",land:"Potreros y agua",goals:"Reproducción y pesos"};
 const checked=setupSchema.parse(a),p=plan(checked);
 assert.equal(p.modules.includes("Producción y venta diaria de leche"),false);
 assert.ok(p.futureModules.some(x=>x.includes("leche")));
 assert.equal(Object.hasOwn(p,"animals"),false);
});
