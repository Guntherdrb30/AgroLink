import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

test("PWA updater evicts old cache-first shell and never intercepts authenticated fetches", async () => {
  const source = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
  const listeners = new Map();
  const deletedCaches = [];
  const claimed = [];
  const skipped = [];
  const context = {
    self: {
      addEventListener(name, fn) { listeners.set(name, fn); },
      skipWaiting: async () => { skipped.push(true); },
      clients: { claim: async () => { claimed.push(true); } },
    },
    caches: {
      keys: async () => ["agrolynk-shell-v1", "agrolynk-shell-v2", "unrelated-cache"],
      delete: async (name) => { deletedCaches.push(name); return true; },
    },
  };

  vm.runInNewContext(source, context);
  assert.equal(listeners.has("fetch"), false, "authenticated requests must not be served from stale cache");

  let installWork;
  listeners.get("install")({ waitUntil(promise) { installWork = promise; } });
  await installWork;
  assert.equal(skipped.length, 1);

  let activateWork;
  listeners.get("activate")({ waitUntil(promise) { activateWork = promise; } });
  await activateWork;
  assert.deepEqual(deletedCaches.sort(), ["agrolynk-shell-v1", "agrolynk-shell-v2"]);
  assert.equal(claimed.length, 1);
});
