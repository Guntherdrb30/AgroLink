/**
 * AgroLynk transactional notifications. Clerk remains the authority for
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
  const greeting = `Hola, ${params.recipientName || "usuario de AgroLynk"}.`;
  const content = [greeting, ...params.paragraphs, `Accede a AgroLynk: ${params.url}`];
  const text = content.join("\n\n");
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#f5f7f4;padding:30px;font-family:Arial,sans-serif;color:#26332a"><table role="presentation" style="max-width:600px;margin:auto;background:white;border-radius:14px;padding:30px;width:100%"><tr><td><p style="font-weight:bold;color:#43633e">AGROLYNK</p><h1 style="font-size:23px">${escapeHtml(params.title)}</h1>${content.slice(0,-1).map(p=>`<p style="font-size:15px;line-height:1.6">${escapeHtml(p)}</p>`).join("")}<a href="${escapeHtml(params.url)}" style="display:inline-block;background:#42663c;color:#fff;padding:13px 20px;text-decoration:none;border-radius:8px">Abrir AgroLynk</a><p style="font-size:12px;color:#68766b;margin-top:25px">Este es un mensaje operativo de AgroLynk. Nunca compartas códigos de acceso ni contraseñas.</p></td></tr></table></body></html>`;
  return { text, html };
}

export function buildAgroLynkMessage(params: {
  event: "welcome" | "submitted" | "approved" | "needs_changes" | "rejected" | "review_started";
  recipientName: string;
  tenantName: string;
  subjectLabel?: "empresa" | "finca";
}) {
  const label = params.subjectLabel ?? "empresa";
  const subject = ({
    welcome: "Bienvenido a AgroLynk: registro de empresa iniciado",
    submitted: `AgroLynk: ${label} recibida para revisión`,
    approved: `AgroLynk: verificación de ${label} aprobada`,
    needs_changes: `AgroLynk: tu ${label} requiere correcciones`,
    rejected: `AgroLynk: resultado de verificación de ${label}`,
    review_started: `AgroLynk: revisión de ${label} iniciada`,
  } as const)[params.event];
  const messages = ({
    welcome: [`Tu cuenta está asociada a "${params.tenantName}".`, "Ya puedes consultar el centro de verificación. Para habilitar la operación completa tendrás que presentar la documentación correspondiente y esperar su aprobación."],
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
      url: "https://agro-link-gray.vercel.app/verification",
    }),
  };
}

export function notificationsConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.AGROLYNK_EMAIL_FROM);
}

export async function sendAgroLynkEmail(params: {
  to: string;
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
}): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AGROLYNK_EMAIL_FROM;
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
      console.error("AgroLynk email provider rejected request:", response.status);
      return { status: "failed" };
    }
    return { status: "accepted" };
  } catch (error) {
    console.error("AgroLynk email delivery request failed:", error instanceof Error ? error.name : "unknown");
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
  const { subject, text, html } = buildAgroLynkMessage(params);
  return sendAgroLynkEmail({
    to: params.to,
    subject,
    text,
    html,
    idempotencyKey: params.idempotencyKey,
  });
}
