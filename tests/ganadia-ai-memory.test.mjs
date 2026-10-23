import assert from "node:assert/strict";
import { test } from "node:test";
import { ganadiaConversationScope, selectGanadiaModelHistory } from "../lib/ai/ganadia-memory-policy.ts";
import { converseGanadia } from "../lib/ai/ganadia-openai-core.ts";

test("scope isolates tenant, user, role and revoked farm permissions", () => {
  const basic = { tenantId: "t1", userId: "u1", role: "TENANT_OWNER", authorizedFarmIds: ["b", "a"] };
  assert.equal(ganadiaConversationScope(basic), ganadiaConversationScope({...basic, authorizedFarmIds:["a","b"]}));
  for (const patch of [{userId:"u2"}, {tenantId:"t2"}, {role:"ACCOUNTING"}, {authorizedFarmIds:["a"]}]) {
    assert.notEqual(ganadiaConversationScope(basic), ganadiaConversationScope({...basic,...patch}));
  }
});
test("history is bounded and remains in user-assistant order", () => {
  const turns = Array.from({length:30},(_,i)=>({role: i%2?"assistant":"user",content:"Turno "+i+" "+("x".repeat(100))}));
  const history = selectGanadiaModelHistory(turns);
  assert.equal(history.length,12);
  assert.equal(history.at(-1).content.startsWith("Turno 29"),true);
  assert.equal(history[0].content.startsWith("Turno 18"),true);
});
test("model receives prior turns and current verified query separately", async () => {
  let seen;
  await converseGanadia({
    role:"TENANT_OWNER", farms:[{id:"a",name:"Finca A"}], message:"¿Y los de 450 kg?",
    allowedTools:["resumen_ganado"], selectedFarmId:"a", minWeightKg:450,
    history:[{role:"user",content:"Revisa mis animales"},{role:"assistant",content:"Tienes 432 animales."}],
    preloaded:[{name:"resumen_ganado",text:"Peso promedio 264.9 kg"}],
  }, {
    invoke:async body => {seen=body.input;return {status:"completed",output_text:"Consulta actualizada."};},
    runTool:async()=>{throw Error("not needed");},
  });
  assert.equal(seen.length,3);
  assert.equal(seen[0].role,"user");
  assert.match(JSON.stringify(seen[2]),/264.9/);
});
