import assert from "node:assert/strict";
import { test } from "node:test";
import { buildGanadIAMessage } from "../server/services/notification-email-service.ts";

test("welcome without documentary verification is branded GanadIA and links to dashboard", () => {
  const message = buildGanadIAMessage({
    event: "welcome", recipientName: "Alicia", tenantName: "Finca El Valle", verificationRequired: false,
  });
  assert.match(message.subject, /Bienvenido a GanadIA/);
  assert.match(message.text, /tu empresa|empresa.*registrada/i);
  assert.match(message.text, /agro-link-gray\.vercel\.app\/dashboard/);
  assert.match(message.html, /Tu finca, gestión inteligente/);
  assert.match(message.html, /Entrar a GanadIA/);
  assert.doesNotMatch(message.subject + message.html + message.text, /AgroLynk/i);
  assert.doesNotMatch(message.text, /esperar su aprobación/i);
});

test("welcome with documentary verification explains the approval and links to verification", () => {
  const message = buildGanadIAMessage({
    event: "welcome", recipientName: "Alicia", tenantName: "Finca El Valle", verificationRequired: true,
  });
  assert.match(message.text, /esperar su aprobación/);
  assert.match(message.text, /agro-link-gray\.vercel\.app\/verification/);
  assert.match(message.subject, /GanadIA/);
});

test("all verification events use GanadIA branding", () => {
  for (const event of ["submitted", "approved", "needs_changes", "rejected", "review_started"]) {
    const message = buildGanadIAMessage({ event, recipientName: "Alicia", tenantName: "Finca El Valle" });
    assert.match(message.subject, /^GanadIA:/);
    assert.doesNotMatch(message.subject + message.html + message.text, /AgroLynk/i);
  }
});

test("dynamic names are escaped in HTML and preserved in plain text", () => {
  const message = buildGanadIAMessage({
    event: "needs_changes",
    recipientName: "<script>alert(1)</script>",
    tenantName: "Finca <Real>",
    subjectLabel: "finca",
  });
  assert.match(message.html, /&lt;script&gt;/);
  assert.doesNotMatch(message.html, /<script>/);
  assert.match(message.text, /Finca <Real>/);
  assert.match(message.subject, /correcciones/);
});
