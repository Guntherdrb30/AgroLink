import assert from "node:assert/strict";
import { test } from "node:test";
import {allowedAiTools,isAuthorizedAiTool,scopeFarmIds,isPaidAiEnabled} from "../lib/ai/ganadia-policy.ts";
test("owner and administrator can use all read tools",()=>{
 for(const role of ["TENANT_OWNER","TENANT_ADMIN"])assert.equal(allowedAiTools(role).length,5);
});
test("accountant cannot access livestock or health",()=>{
 assert.deepEqual(allowedAiTools("ACCOUNTING"),["listar_fincas","resumen_finanzas"]);
 assert.equal(isAuthorizedAiTool("ACCOUNTING","preseleccionar_venta"),false);
});
test("veterinarian cannot read finance or sales",()=>{
 assert.deepEqual(allowedAiTools("VETERINARIAN"),["listar_fincas","resumen_sanidad"]);
 assert.equal(isAuthorizedAiTool("VETERINARIAN","resumen_finanzas"),false);
});
test("unknown role cannot access a tool",()=>{
 assert.deepEqual(allowedAiTools(""),[]);
 assert.equal(isAuthorizedAiTool("ROOT","listar_fincas"),false);
});
test("farm authorization denies cross-farm and preserves scoped filters",()=>{
 assert.deepEqual(scopeFarmIds(null,["finca-a","finca-b"]),["finca-a","finca-b"]);
 assert.deepEqual(scopeFarmIds("finca-b",["finca-a","finca-b"]),["finca-b"]);
 assert.equal(scopeFarmIds("finca-c",["finca-a","finca-b"]),null);
 assert.deepEqual(scopeFarmIds(null,[]),[]);
});
test("paid AI is locked until three independent conditions are true",()=>{
 assert.equal(isPaidAiEnabled({enabled:"true",approved:"false",keyPresent:true}),false);
 assert.equal(isPaidAiEnabled({enabled:"false",approved:"true",keyPresent:true}),false);
 assert.equal(isPaidAiEnabled({enabled:"true",approved:"true",keyPresent:false}),false);
 assert.equal(isPaidAiEnabled({enabled:"true",approved:"true",keyPresent:true}),true);
});
