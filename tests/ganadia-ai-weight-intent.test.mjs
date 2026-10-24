import assert from "node:assert/strict";
import {test} from "node:test";
import {requestedMinimumWeightKg} from "../lib/ai/ganadia-weight-intent.ts";
test("8,000 total kilos is not confused with minimum 450 kg per animal",()=>{
 assert.equal(requestedMinimumWeightKg("GanadIA, revisa mis dos fincas y dime cuál puede completar una guía de 8.000 kilos, con animales de al menos 450 kilos.",450),450);
 assert.equal(requestedMinimumWeightKg("Quiero vender 8.000 kg de ganado",450),450);
 assert.equal(requestedMinimumWeightKg("Quiero 12.000 kilos; peso mínimo de 600 kg por animal",450),600);
});
test("thresholds from everyday Venezuelan phrasing work",()=>{
 assert.equal(requestedMinimumWeightKg("¿Cuántos animales tienen 500 kilos o más?",450),500);
 assert.equal(requestedMinimumWeightKg("ganado de más de 480 kilogramos",450),480);
 assert.equal(requestedMinimumWeightKg("Quiero 8 mil kilos de al menos 400 kg",450),400);
 assert.equal(requestedMinimumWeightKg("peso minimo 430 kg",450),430);
});
test("invalid settings and ambiguous totals fail safe",()=>{
 assert.equal(requestedMinimumWeightKg("8.000 kilos",0),450);
 assert.equal(requestedMinimumWeightKg("8.000 kilos",900),900);
 assert.equal(requestedMinimumWeightKg("animales de al menos 8.000 kg",450),450);
});
