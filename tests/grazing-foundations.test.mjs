import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateGrazingPlan, validateGrazingPlanInput, GrazingInputError,
} from "../lib/planning/grazing-foundations.ts";

const foundation = (i, forage = 2500) => ({
  id:"f"+i,name:"Fundación "+i,geoAreaId:null,hectares:150,
  availablePercent:80,season:"VERANO",forageKgDmHa:forage,usePercent:50,
  waterPoints:1,corralKnown:true,houseKnown:true,floodRisk:false,purpose:"CEBA",
  facilities:[{kind:"CORRAL",lat:8.0,lng:-69.0},{kind:"HOUSE",lat:8.001,lng:-69.001},
    {kind:"WATER",lat:8.002,lng:-69.002}],
  herds:[{id:"g1",category:"NOVILLOS",headcount:40,averageWeightKg:350,
    intakePercent:2.5,restDays:30,occupationDays:3}],
});
const plan = (foundations) => ({
  title:"Estudio de fundaciones del Hato",foundations,assumptionsSource:"DECLARED",
});

test("plan de descanso y ocupacion calcula 11 potreros por grupo",() => {
 const output=calculateGrazingPlan(plan([foundation(1)]));
 assert.equal(output.totals.paddocks,11);
 assert.equal(output.totals.animals,40);
 assert.equal(output.totals.foundations,1);
 assert.equal(output.totals.dailyDryMatterKg,350);
 assert.ok(output.totals.requiredAreaHa>0);
 assert.equal(output.foundations[0].herds[0].occupationDays,3);
});
test("las fundaciones se calculan separadas y luego se consolidan",() => {
 const f2=foundation(2);f2.herds[0].headcount=60;
 const output=calculateGrazingPlan(plan([foundation(1),f2]));
 assert.equal(output.totals.foundations,2);
 assert.equal(output.totals.animals,100);
 assert.equal(output.totals.paddocks,22);
 assert.equal(output.totals.dailyDryMatterKg,875);
 assert.equal(output.foundations[0].heads,40);
 assert.equal(output.foundations[1].heads,60);
});
test("nunca inventa capacidad de carga si no hay aforo",() => {
 const output=calculateGrazingPlan(plan([foundation(1,null)]));
 assert.equal(output.totals.requiredAreaHa,null);
 assert.equal(output.foundations[0].grazingAreaRequiredHa,null);
 assert.equal(output.foundations[0].areaAdequacy,"NO_DATOS");
 assert.ok(output.foundations[0].warnings.some(x=>x.includes("aforo")));
});
test("deficit de forraje y falta de agua producen advertencias",() => {
 const f=foundation(1,25);f.waterPoints=0;f.facilities=[];
 const output=calculateGrazingPlan(plan([f]));
 assert.equal(output.foundations[0].areaAdequacy,"PRELIMINAR_DEFICIT");
 assert.ok(output.foundations[0].warnings.some(x=>x.includes("agua")));
});
test("datos incompletos, cantidades falsas e identificadores duplicados se rechazan",()=>{
 const bad=foundation(1);bad.herds[0].headcount=-1;
 assert.throws(()=>validateGrazingPlanInput(plan([bad])),GrazingInputError);
 assert.throws(()=>validateGrazingPlanInput(plan([foundation(1),foundation(1)])),/únicos/i);
 assert.throws(()=>validateGrazingPlanInput(plan([])),/fundaciones/i);
});
test("coordenadas de instalaciones se validan antes de persistir",()=>{
 const bad=foundation(1);bad.facilities[0].lat=999;
 assert.throws(()=>validateGrazingPlanInput(plan([bad])),/latitud/i);
});
test("los supuestos del productor no son modificados por el cálculo",()=>{
 const input=plan([foundation(1),foundation(2)]);
 const original=structuredClone(input);
 const first=calculateGrazingPlan(input);
 const second=calculateGrazingPlan(input);
 assert.deepEqual(input,original);
 assert.deepEqual(first,second);
});
