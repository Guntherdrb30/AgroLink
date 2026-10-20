/**
 * GanadIA transactional notifications. Clerk remains the authority for
 * sign-in / sign-up verification codes and password recovery.
 *
 * RESEND_API_KEY is only read on the server; never embed in client bundles.
 */
type EmailStatus = "accepted" | "not_configured" | "failed";

export type EmailResult = { status: EmailStatus };

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      default: return "&#39;";
    }
  });
}

function makeEmail(params: { title: string; recipientName: string; paragraphs: string[]; url: string }) {
  const greeting = `Hola, ${params.recipientName || "usuario de GanadIA"}.`;
  const content = [greeting, ...params.paragraphs, `Accede a GanadIA: ${params.url}`];
  const text = content.join("\n\n");
  const ctaLabel = params.url.endsWith("/dashboard") ? "Entrar a GanadIA" : "Ver estado en GanadIA";
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:24px 12px;background:#f3f5f0;font-family:Arial,Helvetica,sans-serif;color:#22352a"><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;margin:0 auto;border-collapse:collapse;background:#ffffff;border-radius:18px;overflow:hidden"><tr><td style="padding:30px 28px;background:#172b20"><p style="margin:0;font-size:26px;line-height:1.2;font-weight:800;letter-spacing:-0.6px;color:#ffffff">Ganad<span style="color:#d4b074">IA</span></p><p style="margin:8px 0 0;font-size:13px;line-height:1.5;color:#f3e8d0">Tu finca, gestión inteligente.</p></td></tr><tr><td style="padding:29px 28px 33px"><p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:2px;color:#9b773f">NOTIFICACIÓN DE GANADIA</p><h1 style="margin:0 0 24px;font-size:23px;line-height:1.32;color:#203629">${escapeHtml(params.title)}</h1>${content.slice(0, -1).map((paragraph) => `<p style="font-size:15px;line-height:1.75;color:#42544a;margin:0 0 18px">${escapeHtml(paragraph)}</p>`).join("")}<p style="margin:24px 0"><a href="${escapeHtml(params.url)}" style="display:inline-block;background:#876633;color:#ffffff;font-weight:700;font-size:14px;line-height:1.4;text-decoration:none;border-radius:999px;padding:14px 22px">${escapeHtml(ctaLabel)}</a></p><p style="margin:26px 0 0;padding-top:18px;border-top:1px solid #e4e7e0;font-size:12px;line-height:1.65;color:#7a867c">Este es un mensaje de GanadIA, plataforma tecnológica de Trends172Tech. Nunca compartas códigos de acceso ni contraseñas.</p></td></tr></table></body></html>`;
  return { text, html };
}

export function buildGanadIAMessage(params: {
  event: "welcome" | "submitted" | "approved" | "needs_changes" | "rejected" | "review_started";
  recipientName: string;
  tenantName: string;
  subjectLabel?: "empresa" | "finca";
  verificationRequired?: boolean;
}) {
  const label = params.subjectLabel ?? "empresa";
  const verificationRequired = params.verificationRequired ?? (process.env.GANADIA_REQUIRE_BUSINESS_VERIFICATION !== "false");
  const subject = ({
    welcome: "Bienvenido a GanadIA: tu empresa está registrada",
    submitted: `GanadIA: ${label} recibida para revisión`,
    approved: `GanadIA: verificación de ${label} aprobada`,
    needs_changes: `GanadIA: tu ${label} requiere correcciones`,
    rejected: `GanadIA: resultado de verificación de ${label}`,
    review_started: `GanadIA: revisión de ${label} iniciada`,
  } as const)[params.event];
  const messages = ({
    welcome: verificationRequired
      ? [`Tu cuenta está asociada a "${params.tenantName}".`, "Para habilitar la operación completa deberás presentar la documentación correspondiente y esperar su aprobación."]
      : [`Tu empresa "${params.tenantName}" ya está registrada en GanadIA.`, "Ya puedes entrar al panel para registrar fincas y organizar tu actividad agropecuaria. La verificación documental se activará antes del lanzamiento definitivo."],
    submitted: [`Recibimos la solicitud de revisión de ${label} para "${params.tenantName}".`, "Puedes consultar el estado de la solicitud en tu panel."],
    approved: [`Se aprobó la verificación de ${label} para "${params.tenantName}".`, "Entra a la plataforma para conocer las operaciones que ya puedes realizar."],
    needs_changes: [`La verificación de ${label} para "${params.tenantName}" requiere correcciones.`, "Consulta las observaciones en la plataforma y vuelve a presentar la documentación allí. No envíes documentos sensibles respondiendo a este correo."],
    rejected: [`La solicitud de verificación de ${label} para "${params.tenantName}" no fue aprobada.`, "Revisa el estado en la plataforma. Si necesitas ayuda, contacta al equipo de soporte."],
    review_started: [`Comenzó la revisión de ${label} para "${params.tenantName}".`, "Puedes seguir su estado desde el panel de verificación."],
  } as const)[params.event];
  return {
    subject,
    ...makeEmail({
      title: subject,
      recipientName: params.recipientName,
      paragraphs: [...messages],
      url: "https://agro-link-gray.vercel.app" + (params.event === "welcome" && !verificationRequired ? "/dashboard" : "/verification"),
    }),
  };
}

export function notificationsConfigured() {
  return Boolean(process.env.RESEND_API_KEY && (process.env.GANADIA_EMAIL_FROM || process.env.AGROLYNK_EMAIL_FROM));
}

export async function sendGanadIAEmail(params: {
  to: string;
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
}): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.GANADIA_EMAIL_FROM || process.env.AGROLYNK_EMAIL_FROM;
  if (!apiKey || !from) return { status: "not_configured" };
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": params.idempotencyKey,
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: params.subject,
        text: params.text,
        html: params.html,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      console.error("GanadIA email provider rejected request:", response.status);
      return { status: "failed" };
    }
    return { status: "accepted" };
  } catch (error) {
    console.error("GanadIA email delivery request failed:", error instanceof Error ? error.name : "unknown");
    return { status: "failed" };
  }
}

export async function sendVerificationNotification(params: {
  event: "welcome" | "submitted" | "approved" | "needs_changes" | "rejected" | "review_started";
  tenantId: string;
  to: string;
  recipientName: string;
  tenantName: string;
  idempotencyKey: string;
  subjectLabel?: "empresa" | "finca";
}) {
  const { subject, text, html } = buildGanadIAMessage(params);
  return sendGanadIAEmail({
    to: params.to,
    subject,
    text,
    html,
    idempotencyKey: params.idempotencyKey,
  });
}
