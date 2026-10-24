import assert from "node:assert/strict";
import { test } from "node:test";
import {
 extractTargetKilograms, wantsFarmComparison,
 acceptsRecommendedFarm, compareAuthorizedFarmCapacity,
} from "../lib/ai/ganadia-farm-capacity.ts";

test("the customer's exact repeated questions request a comparison instead of looping",()=>{
 assert.equal(wantsFarmComparison("Pues si se puede de una sola que cumpla con ese número"),true);
 assert.equal(wantsFarmComparison("Revisa y si una sola finca cumple con los 8000 dime cuál así puedo elegir"),true);
 assert.equal(wantsFarmComparison("Comparar mis fincas"),true);
 assert.equal(wantsFarmComparison("Hato La prueba"),false);
});
test("remembers the 8,000 total from previous user messages, ignoring 450-kg individual thresholds",()=>{
 const history=[
  {role:"user",content:"Quiero sacar una guía de 8.000 kilos de ganado"},
  {role:"assistant",content:"¿De qué finca?"},
  {role:"user",content:"con animales de 450 kilos como mínimo"},
  {role:"assistant",content:"¿Qué finca?"},
 ];
 assert.equal(extractTargetKilograms("si se puede de una sola, revisa cuál",history),8000);
 assert.equal(extractTargetKilograms("Revisa cuál cumple los 8,000 kilos",history),8000);
 assert.equal(extractTargetKilograms("Una guía de 9 mil kilos",history),9000);
 assert.equal(extractTargetKilograms("Peso mínimo 450 kilos",[]),null);
 assert.equal(extractTargetKilograms("Unos 450 kilos",[]),null);
});
test("accepting an explicit farm recommendation must be distinguishable from asking to compare",()=>{
 assert.equal(acceptsRecommendedFarm("Sí"),true);
 assert.equal(acceptsRecommendedFarm("Vamos con esa"),true);
 assert.equal(acceptsRecommendedFarm("Elige la que cumpla"),true);
 assert.equal(acceptsRecommendedFarm("Revisa y dime cual así puedo elegir"),false);
});
test("one eligible farm is recommended with a measurable selection",()=>{
 const farmA=Array.from({length:11},(_,i)=>({id:"a"+i,code:"A"+i,kg: i===0?554:500}));
 const farmB=Array.from({length:26},(_,i)=>({id:"b"+i,code:"B"+i,kg:i===0?543:500}));
 const x=compareAuthorizedFarmCapacity([
  {id:"a",name:"Finca Angelucci",animals:farmA},
  {id:"b",name:"Hato La prueba",animals:farmB},
 ],8000);
 assert.equal(x.recommendedId,"b");
 assert.equal(x.capableCount,1);
 assert.equal(x.farms[0].availableKg,5554);
 assert.equal(x.farms[0].canMeetTarget,false);
 assert.equal(x.farms[1].availableKg,13043);
 assert.equal(x.farms[1].canMeetTarget,true);
 assert.ok(x.farms[1].proposal.count>0);
 assert.ok(Math.abs(x.farms[1].proposal.differenceKg)<=500);
});
test("none meets the goal returns no suggestion, so no guide is silently produced",()=>{
 const x=compareAuthorizedFarmCapacity([
  {id:"a",name:"First",animals:[{id:"a1",code:"A",kg:500}]},
  {id:"b",name:"Second",animals:[]},
 ],8000);
 assert.equal(x.recommendedId,null);
 assert.equal(x.capableCount,0);
});
test("comparison never combines cattle from two separate farms",()=>{
 const x=compareAuthorizedFarmCapacity([
  {id:"a",name:"First",animals:Array.from({length:8},(_,i)=>({id:"a"+i,code:"A"+i,kg:500}))},
  {id:"b",name:"Second",animals:Array.from({length:8},(_,i)=>({id:"b"+i,code:"B"+i,kg:500}))},
 ],8000);
 assert.equal(x.capableCount,0);
});
