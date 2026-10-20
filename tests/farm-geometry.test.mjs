import assert from "node:assert/strict";
import { test } from "node:test";
import { validateGeoRing, polygonContainedBy, pointInsidePolygon } from "../lib/geography/farm-geometry.ts";
const outer = [[-69.00,8.00],[-68.99,8.00],[-68.99,8.01],[-69.00,8.01]];
test("Geometría WGS84 válida, superficie positiva y anillo cerrado",()=>{
 const g=validateGeoRing(outer);assert.equal(g.ring.length,4);assert.equal(g.geometry.coordinates[0].length,5);assert.ok(g.areaHectares>100);
});
test("Rectángulo con vértices cruzados se rechaza",()=>{
 assert.throws(()=>validateGeoRing([[-69,8],[-68.99,8.01],[-69,8.01],[-68.99,8]]),/cruzan|superficie/);
});
test("Puntos con rangos incorrectos se rechazan",()=>{
 assert.throws(()=>validateGeoRing([[200,8],[-68.99,8],[-68.99,8.01]]),/GPS/);
});
test("Potreros dentro de finca válidos, externos bloqueados",()=>{
 const inside=[[-68.998,8.002],[-68.996,8.002],[-68.996,8.004],[-68.998,8.004]];
 const outside=[[-68.998,8.002],[-68.988,8.002],[-68.988,8.004],[-68.998,8.004]];
 assert.ok(polygonContainedBy(outer,inside));
 assert.equal(polygonContainedBy(outer,outside),false);
 assert.ok(pointInsidePolygon([-68.995,8.005],outer));
});
test("Repeticiones y polígonos inválidos no pasan",()=>{
 assert.throws(()=>validateGeoRing([[-69,8],[-69,8],[-68.99,8.01]]),/repetidos/);
 assert.throws(()=>validateGeoRing([[0,0],[1,1]]),/tres puntos/);
});
