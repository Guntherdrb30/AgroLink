import { NextResponse } from "next/server";
import { makeAiContext, runAiTool } from "@/lib/ai/ganadia-tools";
import {
  allowedAiTools, isAuthorizedAiTool, isPaidAiEnabled,
  scopeFarmIds, type AiToolName,
} from "@/lib/ai/ganadia-policy";
import { converseGanadia } from "@/lib/ai/ganadia-openai-core";
import { invokeGanadiaPilotedOpenAI } from "@/lib/ai/ganadia-openai";
import { GanadiaPilotBudgetError } from "@/lib/ai/ganadia-budget";
import { inferGanadiaReadTools } from "@/lib/ai/ganadia-intent";
import { beginGanadiaChatTurn, appendGanadiaChatTurn } from "@/lib/ai/ganadia-memory";
import { handleGanadiaSaleFlow } from "@/lib/ai/ganadia-sale-flow";
import { requestedMinimumWeightKg } from "@/lib/ai/ganadia-weight-intent";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const send = (value: unknown, status = 200) =>
  NextResponse.json(value, { status, headers: { "Cache-Control": "private, no-store" } });
const topics: Record<string, AiToolName> = {
  fincas: "listar_fincas", ganado: "resumen_ganado", sanidad: "resumen_sanidad",
  finanzas: "resumen_finanzas", venta: "preseleccionar_venta",
};
export async function POST(request: Request) {
  const ctx = await makeAiContext();
  if (!ctx) return send({ error: "Necesitas iniciar sesión y pertenecer a una empresa." }, 401);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return send({ error: "Origen no autorizado." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return send({ error: "Formato no admitido." }, 415);
  }
  const raw = await request.text();
  if (raw.length > 5000) return send({ error: "Consulta demasiado larga." }, 413);
  let body: { message?: unknown; topic?: unknown; farmId?: unknown; minWeightKg?: unknown };
  try { body = JSON.parse(raw); } catch { return send({ error: "Solicitud inválida." }, 400); }
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 700) : "";
  const topic = typeof body.topic === "string" ? body.topic : "";
  const role = ctx.ctx.membership.role;
  const allowed = allowedAiTools(role);
  if (!allowed.length) return send({ error: "Tu perfil no permite consultas con IA." }, 403);
  const farmId = typeof body.farmId === "string" && body.farmId.length < 120 ? body.farmId : null;
  if (!scopeFarmIds(farmId, ctx.farms.map(f => f.id))) {
    return send({ error: "No tienes permiso para esa finca." }, 403);
  }
  const weight = requestedMinimumWeightKg(
    topic ? "" : message,
    typeof body.minWeightKg === "number" ? body.minWeightKg : 450,
  );
  const requestedTools: AiToolName[] = topics[topic] ? [topics[topic]] : inferGanadiaReadTools(message);
  if (requestedTools.some(name => !isAuthorizedAiTool(role, name))) {
    return send({ error: "Tu perfil no tiene acceso a toda la información solicitada." }, 403);
  }
  const generative = isPaidAiEnabled({
    enabled: process.env.GANADIA_AI_PAID_ENABLED,
    approved: process.env.GANADIA_AI_COST_APPROVED,
    keyPresent: Boolean(process.env.OPENAI_API_KEY),
  });
  try {
    if(message){const flow=await handleGanadiaSaleFlow(ctx,message,weight);if(flow)return send({...flow,farms:ctx.farms});}
    const chat = await beginGanadiaChatTurn(ctx);
    // The old deterministic assistant stays available without billable AI.
    if (!generative) {
      if (!requestedTools.length) return send({
        reply: "Puedo consultar tus fincas, ganado, sanidad, finanzas o preparar una preselección de venta. ¿Qué necesitas revisar? Esta versión todavía no utiliza OpenAI.",
        farms: ctx.farms, mode: "asistido",
      });
      const summaries = await Promise.all(requestedTools.map(name => runAiTool(ctx, name, { farmId, minWeightKg: weight })));
      const reply = summaries.map(item => item.text).join("\n\n");
      await appendGanadiaChatTurn(ctx, chat, message, reply);
      return send({ reply, tool: requestedTools[0], farms: ctx.farms, mode: "asistido" });
    }
    if (!message) return send({ error: "Escribe una consulta." }, 422);
    const preloaded = await Promise.all(requestedTools.map(async name => ({
      name, text: (await runAiTool(ctx, name, { farmId, minWeightKg: weight })).text,
    })));
    const result = await converseGanadia({
      message, role, farms: ctx.farms, allowedTools: allowed,
      selectedFarmId: farmId, minWeightKg: weight, preloaded, history: chat.history,
    }, {
      invoke: payload => invokeGanadiaPilotedOpenAI({
        tenantId: ctx.ctx.tenant.id, userId: ctx.ctx.user.id,
      }, payload),
      runTool: (name, args) => runAiTool(ctx, name, args),
    });
    const saved = await appendGanadiaChatTurn(ctx, chat, message, result.reply);
    if (!saved) return send({ error: "La conversación se limpió mientras se generaba la respuesta. No se guardó el mensaje." }, 409);
    return send({ ...result, farms: ctx.farms, mode: "generativo" });
  } catch (e) {
    if (e instanceof GanadiaPilotBudgetError) {
      const code = e.code;
      return send({
        error: code === "PILOT_BUDGET_EXHAUSTED" ?
          "La cuota temporal de pruebas de IA se agotó. Las consultas asistidas siguen disponibles." :
          "El control de presupuesto de pruebas no está listo; no se realizó ninguna llamada paga.",
      }, code === "PILOT_BUDGET_EXHAUSTED" ? 429 : 503);
    }
    if (e instanceof Error && e.message === "FARM_DENIED") return send({ error: "No tienes permiso para esa finca." }, 403);
    if (e instanceof Error && (e.message === "INVALID_WEIGHT" || e.message === "AI_TOOL_ARGS_INVALID")) {
      return send({ error: "Introduce un peso mínimo válido entre 1 y 2000 kg." }, 422);
    }
    if (e instanceof Error && (e.message === "TOOL_DENIED" || e.message === "AI_ROLE_DENIED")) {
      return send({ error: "No tienes permiso para esa consulta." }, 403);
    }
    console.error("GanadIA AI request failed", e instanceof Error ? e.message : "unknown error");
    return send({ error: "No se pudo completar la consulta con IA. Inténtalo más tarde." }, 503);
  }
}
