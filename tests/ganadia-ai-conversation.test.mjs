import assert from "node:assert/strict";
import { test } from "node:test";
import { converseGanadia } from "../lib/ai/ganadia-openai-core.ts";
const farms = [{ id: "farm-1", name: "Finca A" }];
const message = "¿Cuántas vacas tengo?";
function validInput(extra = {}) {
  return {
    message, role: "TENANT_OWNER", farms,
    allowedTools: ["listar_fincas", "resumen_ganado"],
    selectedFarmId: "farm-1", minWeightKg: 450, ...extra,
  };
}
test("natural question can call a single authorized tool and then answer", async () => {
  let n = 0; const calls = [];
  const result = await converseGanadia(validInput(), {
    invoke: async body => {
      calls.push(body);
      n++;
      return n === 1 ? { status: "completed", output: [
        { type: "function_call", name: "resumen_ganado", call_id: "call-1",
          arguments: JSON.stringify({ farmId: "farm-1", minWeightKg: null }) },
      ] } : { status: "completed", output: [
        { type: "message", content: [{ type: "output_text", text: "Tienes 3 animales registrados." }] },
      ] };
    },
    runTool: async (name, args) => {
      assert.equal(name, "resumen_ganado");
      assert.equal(args.farmId, "farm-1");
      return { text: "3 animales" };
    },
  });
  assert.equal(result.reply, "Tienes 3 animales registrados.");
  assert.equal(calls.length, 2);
  assert.equal(calls[0].model, "gpt-5.4-mini");
  assert.equal(calls[0].store, false);
  assert.equal(calls[0].parallel_tool_calls, false);
  assert.equal(calls[1].tool_choice, "none");
});
test("role restrictions prevent unauthorized tool execution", async () => {
  let called = false;
  await assert.rejects(converseGanadia(validInput({ role: "ACCOUNTING",
    allowedTools: ["listar_fincas"] }), {
    invoke: async () => ({ status: "completed", output: [
      { type: "function_call", name: "resumen_finanzas", call_id: "bad", arguments: "{}" },
    ] }),
    runTool: async () => { called = true; return { text: "sensitive" }; },
  }), /TOOL_DENIED/);
  assert.equal(called, false);
});
test("scope restrictions reject a farm not assigned to the user before invoking tools", async () => {
  let called = false;
  await assert.rejects(converseGanadia(validInput({ selectedFarmId: "farm-other" }), {
    invoke: async () => { called = true; return {}; },
    runTool: async () => ({ text: "unused" }),
  }), /FARM_DENIED/);
  assert.equal(called, false);
});
test("model cannot choose an unassigned farm even when user selected all", async () => {
  await assert.rejects(converseGanadia(validInput({ selectedFarmId: null }), {
    invoke: async () => ({ status: "completed", output: [
      { type: "function_call", name: "resumen_ganado", call_id: "bad",
        arguments: JSON.stringify({ farmId: "foreign-farm", minWeightKg: 500 }) },
    ] }),
    runTool: async () => { throw Error("SHOULD_NOT_RUN"); },
  }), /FARM_DENIED/);
});
test("preloaded verified results need one model call and no tools", async () => {
  let calls = 0;
  const result = await converseGanadia(validInput({
    preloaded: { name: "resumen_ganado", text: "3 animales" },
  }), {
    invoke: async body => {
      calls++;
      assert.equal(body.tool_choice, "none");
      assert.equal(body.tools.length, 0);
      return { status: "completed", output_text: "Hay 3 animales registrados." };
    },
    runTool: async () => { throw Error("SHOULD_NOT_RUN"); },
  });
  assert.equal(calls, 1);
  assert.equal(result.tool, "resumen_ganado");
});
test("missing reply and unexpected second tool calls fail closed", async () => {
  await assert.rejects(converseGanadia(validInput(), {
    invoke: async () => ({ status: "completed", output: [] }),
    runTool: async () => ({ text: "unused" }),
  }), /AI_RESPONSE_EMPTY/);
});
