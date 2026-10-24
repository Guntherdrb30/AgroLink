import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseSpanishNumber, numberFromText, parseSaleSelection,
  selectSaleAnimals, MAX_ANIMALS_PER_GUIDE,
} from "../lib/ai/ganadia-sale-selection.ts";

test("read Venezuelan and mixed number formats without confusing thousands and decimals", () => {
  assert.equal(parseSpanishNumber("8.000"), 8000);
  assert.equal(parseSpanishNumber("8,000"), 8000);
  assert.equal(parseSpanishNumber("8 mil"), 8000);
  assert.equal(parseSpanishNumber("8.000,50"), 8000.5);
  assert.equal(parseSpanishNumber("8,000.50"), 8000.5);
  assert.equal(parseSpanishNumber("8 000"), 8000);
  assert.equal(parseSpanishNumber("2,50"), 2.5);
  assert.equal(parseSpanishNumber("2.50"), 2.5);
  assert.equal(parseSpanishNumber("450"), 450);
  assert.equal(parseSpanishNumber("ocho mil"), null);
  assert.equal(numberFromText("unos 8 mil kilos"), 8000);
});

test("guide request understands quantity, kilograms, all, and unitless large amounts", () => {
  assert.deepEqual(parseSaleSelection("Prepárame una guía de aproximadamente 8.000 kilos"), {kind:"targetKg",targetKg:8000});
  assert.deepEqual(parseSaleSelection("8000"), {kind:"targetKg",targetKg:8000});
  assert.deepEqual(parseSaleSelection("8,000 kg"), {kind:"targetKg",targetKg:8000});
  assert.deepEqual(parseSaleSelection("8 mil kilos"), {kind:"targetKg",targetKg:8000});
  assert.deepEqual(parseSaleSelection("15 animales"), {kind:"quantity",count:15});
  assert.deepEqual(parseSaleSelection("37"), {kind:"quantity",count:37});
  assert.deepEqual(parseSaleSelection("Todos"), {kind:"all"});
  assert.equal(parseSaleSelection("sin cantidad"),null);
});

test("a kilogram target produces a near-matching measured sum, not a fixed animal count", () => {
  const candidates = [
    {id:"a",code:"A",kg:525},
    {id:"b",code:"B",kg:515},
    {id:"c",code:"C",kg:505},
    {id:"d",code:"D",kg:490},
    {id:"e",code:"E",kg:480},
    {id:"f",code:"F",kg:475},
  ];
  const chosen=selectSaleAnimals(candidates,{kind:"targetKg",targetKg:1000});
  assert.equal(chosen.targetReachable,true);
  assert.equal(chosen.totalKg,1000);
  assert.equal(chosen.differenceKg,0);
  assert.equal(chosen.count,2);
  assert.deepEqual(chosen.animals.map(a=>a.id),["a","f"]);
  assert.equal(candidates.length,6);
});

test("8,000 kg target finds measured animals while preserving a 100-head limit", () => {
  const candidates=Array.from({length:80},(_,i)=>({id:"head-"+i,code:"L-"+i,kg:450+(i%17)*9}));
  const chosen=selectSaleAnimals(candidates,{kind:"targetKg",targetKg:8000});
  assert.equal(chosen.targetReachable,true);
  assert.ok(chosen.count>0 && chosen.count<=MAX_ANIMALS_PER_GUIDE);
  assert.ok(Math.abs(chosen.differenceKg)<300);
  assert.equal(chosen.totalKg,chosen.animals.reduce((s,a)=>s+a.kg,0));
});

test("unreachable kilograms never silently generate an undersized draft", () => {
  const candidates=Array.from({length:11},(_,i)=>({id:"head-"+i,code:"X-"+i,kg:480}));
  const result=selectSaleAnimals(candidates,{kind:"targetKg",targetKg:8000});
  assert.equal(result.targetReachable,false);
  assert.equal(result.count,0);
  assert.equal(result.maxAvailableKg,5280);
});

test("selection by count and selecting all maintain original behavior", () => {
  const candidates=[{id:"1",code:"A",kg:450},{id:"2",code:"B",kg:530},{id:"3",code:"C",kg:480}];
  const count=selectSaleAnimals(candidates,{kind:"quantity",count:2});
  assert.deepEqual(count.animals.map(a=>a.id),["2","3"]);
  assert.equal(count.totalKg,1010);
  assert.equal(count.differenceKg,null);
  assert.equal(selectSaleAnimals(candidates,{kind:"all"}).count,3);
});

test("all beyond 100, invalid totals and invalid counts fail closed", () => {
  const lots=Array.from({length:105},(_,i)=>({id:String(i),code:String(i),kg:500}));
  assert.throws(()=>selectSaleAnimals(lots,{kind:"all"}),/INVALID_GUIDE_COUNT/);
  assert.throws(()=>selectSaleAnimals(lots,{kind:"quantity",count:0}),/INVALID_GUIDE_COUNT/);
  assert.throws(()=>selectSaleAnimals(lots,{kind:"quantity",count:101}),/INVALID_GUIDE_COUNT/);
  assert.throws(()=>selectSaleAnimals(lots,{kind:"targetKg",targetKg:-1}),/INVALID_KG_TARGET/);
  const capped=selectSaleAnimals(lots,{kind:"targetKg",targetKg:50_500});
  assert.equal(capped.targetReachable,false);
  assert.equal(capped.maxAvailableKg,50_000);
});
