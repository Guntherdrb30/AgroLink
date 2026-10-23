import { NextResponse } from "next/server";
import { makeAiContext } from "@/lib/ai/ganadia-tools";
import { allowedAiTools } from "@/lib/ai/ganadia-policy";
import { clearGanadiaChat, getGanadiaChatPage } from "@/lib/ai/ganadia-memory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const reply = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

export async function GET(request: Request) {
  const ctx = await makeAiContext();
  if (!ctx) return reply({ error: "Inicia sesión para recuperar tu conversación." }, 401);
  if (!allowedAiTools(ctx.ctx.membership.role).length) {
    return reply({ error: "No tienes acceso a GanadIA AI." }, 403);
  }
  try {
    const before = new URL(request.url).searchParams.get("before");
    const page = await getGanadiaChatPage(ctx, before);
    return reply({ ...page, farms: ctx.farms });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_CHAT_CURSOR") {
      return reply({ error: "No se encontró esa página de la conversación." }, 400);
    }
    console.error("GanadIA history read failed", error instanceof Error ? error.name : "unknown");
    return reply({ error: "No se pudo cargar el historial." }, 503);
  }
}

export async function DELETE(request: Request) {
  const ctx = await makeAiContext();
  if (!ctx) return reply({ error: "Inicia sesión para limpiar tu conversación." }, 401);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return reply({ error: "Origen no autorizado." }, 403);
  }
  if (!allowedAiTools(ctx.ctx.membership.role).length) {
    return reply({ error: "No tienes acceso a GanadIA AI." }, 403);
  }
  try {
    await clearGanadiaChat(ctx);
    return reply({ cleared: true, messages: [] });
  } catch (error) {
    console.error("GanadIA history clear failed", error instanceof Error ? error.name : "unknown");
    return reply({ error: "No se pudo limpiar la conversación." }, 503);
  }
}
