import assert from "node:assert/strict";
import { test } from "node:test";
import { inferGanadiaReadTools } from "../lib/ai/ganadia-intent.ts";

test("regression: natural mixed question fetches real cattle records and farm list", () => {
  const tools = inferGanadiaReadTools(
    "Hola, GanadIA. Consulta los datos de mis fincas y dime cuántos animales tengo registrados, cuál es su peso promedio y qué recomendaciones me das para administrar mejor el ganado."
  );
  assert.deepEqual(tools, ["resumen_ganado", "listar_fincas"]);
});

test("simple farm list still requests only authorized farm list", () => {
  assert.deepEqual(inferGanadiaReadTools("Muéstrame mis fincas"), ["listar_fincas"]);
});

test("standalone cattle summary works with accented words", () => {
  assert.deepEqual(inferGanadiaReadTools("¿Cuántos animales tengo y cuál es el peso promedio?"), ["resumen_ganado"]);
});

test("compound finance and livestock query fetches both while keeping farm context", () => {
  assert.deepEqual(inferGanadiaReadTools("Resume las finanzas y el peso del ganado de mis fincas"), [
    "resumen_ganado", "resumen_finanzas", "listar_fincas",
  ]);
});

test("veterinary question does not request unrelated cattle inventory", () => {
  assert.deepEqual(inferGanadiaReadTools("¿Qué vacunas tienen los animales de mi finca?"), [
    "resumen_sanidad", "listar_fincas",
  ]);
});

test("sale-only query does not accidentally request all animal metrics", () => {
  assert.deepEqual(inferGanadiaReadTools("¿Qué animales están listos para venta?"), [
    "preseleccionar_venta",
  ]);
});

test("general livestock advice can enrich with authorized real records", () => {
  assert.deepEqual(inferGanadiaReadTools("Consejos para administrar mejor el ganado"), [
    "resumen_ganado",
  ]);
});

test("unrecognized generic question remains conversational and cannot infer unrestricted tools", () => {
  assert.deepEqual(inferGanadiaReadTools("Hola, ¿puedes explicarme cómo funciona el sistema?"), []);
});
