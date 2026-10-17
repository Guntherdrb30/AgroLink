import assert from "node:assert/strict";
import { test } from "node:test";
import { buildAgroLynkMessage } from "../server/services/notification-email-service.ts";

test("welcome email includes verification next steps and a trusted URL", () => {
  const message = buildAgroLynkMessage({ event: "welcome", recipientName: "Alicia", tenantName: "Finca El Valle" });
  assert.match(message.subject, /Bienvenido/);
  assert.match(message.text, /documentación/);
  assert.match(message.text, /agro-link-gray\.vercel\.app\/verification/);
});

test("dynamic names are escaped in HTML and kept in plain text", () => {
  const message = buildAgroLynkMessage({ event: "needs_changes", recipientName: "<script>alert(1)</script>", tenantName: "Finca <Real>", subjectLabel: "finca" });
  assert.match(message.html, /&lt;script&gt;/);
  assert.doesNotMatch(message.html, /<script>/);
  assert.match(message.text, /Finca <Real>/);
  assert.match(message.subject, /correcciones/);
});
