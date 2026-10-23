"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bot, X, Send, LoaderCircle, ShieldCheck, Sparkles,
  Trash2, SlidersHorizontal, ChevronDown, ChevronUp, MessageSquareText,
} from "lucide-react";

type Msg = { id?: string; by: "assistant" | "user"; text: string };
type Farm = { id: string; name: string };
type ChatHistory = {
  messages: Msg[];
  farms: Farm[];
  hasMore: boolean;
  nextCursor: string | null;
};
type Reply = { reply: string; farms?: Farm[]; mode?: "asistido" | "generativo" };

const HELLO = "¡Hola! Soy GanadIA. Pregúntame por tu ganado, tus fincas o su administración. Podemos conversar con palabras sencillas.";
const CHAT_PATH = "/api/ganadia-ai/chat";
const HISTORY_PATH = "/api/ganadia-ai/history";

export function GanadiaAssistant({
  financeOnly = false,
  veterinaryOnly = false,
}: {
  financeOnly?: boolean;
  veterinaryOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [message, setMessage] = useState("");
  const [farmId, setFarmId] = useState("");
  const [farms, setFarms] = useState<Farm[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [errorText, setErrorText] = useState("");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [mode, setMode] = useState<"asistido" | "generativo" | null>(null);
  const [weight, setWeight] = useState("450");
  const endRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previousLength = useRef(0);
  const olderScroll = useRef<{ height: number; top: number } | null>(null);

  const topics = veterinaryOnly
    ? [["fincas", "Mis fincas"], ["sanidad", "Sanidad"]]
    : financeOnly
      ? [["fincas", "Mis fincas"], ["finanzas", "Finanzas"]]
      : [
          ["fincas", "Mis fincas"], ["ganado", "Ganado"],
          ["sanidad", "Sanidad"], ["finanzas", "Finanzas"],
          ["venta", "Preparar venta"],
        ];

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoadingHistory(true);
    setErrorText("");
    setOptionsOpen(false);
    void (async () => {
      try {
        const response = await fetch(HISTORY_PATH, {
          cache: "no-store", signal: controller.signal,
        });
        const data = await response.json() as ChatHistory & { error?: string };
        if (!response.ok) throw new Error(data.error || "No se pudo recuperar el chat.");
        if (controller.signal.aborted) return;
        setMessages(data.messages || []);
        setFarms(data.farms || []);
        setHasMore(Boolean(data.hasMore));
        setCursor(data.nextCursor || null);
        previousLength.current = 0;
      } catch (error) {
        if (controller.signal.aborted) return;
        setErrorText(error instanceof Error ? error.message : "No se pudo recuperar la conversación.");
      } finally {
        if (!controller.signal.aborted) setLoadingHistory(false);
      }
    })();
    return () => controller.abort();
  }, [open]);

  useEffect(() => {
    if (!open || loadingHistory) return;
    if (olderScroll.current) {
      const box = scrollRef.current;
      if (box) {
        box.scrollTop = box.scrollHeight - olderScroll.current.height + olderScroll.current.top;
      }
      olderScroll.current = null;
      previousLength.current = messages.length;
      return;
    }
    if (messages.length >= previousLength.current) {
      endRef.current?.scrollIntoView({ block: "end", behavior: "auto" });
    }
    previousLength.current = messages.length;
  }, [messages, open, busy, loadingHistory]);

  async function showOlder() {
    if (!cursor || loadingOlder || busy) return;
    const container = scrollRef.current;
    if (container) olderScroll.current = {
      height: container.scrollHeight,
      top: container.scrollTop,
    };
    setLoadingOlder(true);
    try {
      const response = await fetch(HISTORY_PATH + "?before=" + encodeURIComponent(cursor), {
        cache: "no-store",
      });
      const data = await response.json() as ChatHistory & { error?: string };
      if (!response.ok) throw new Error(data.error || "No se pudo cargar el historial.");
      setMessages(existing => [...data.messages, ...existing]);
      setHasMore(data.hasMore);
      setCursor(data.nextCursor);
    } catch (error) {
      olderScroll.current = null;
      setErrorText(error instanceof Error ? error.message : "No se pudieron cargar mensajes anteriores.");
    } finally {
      setLoadingOlder(false);
    }
  }

  async function send(text: string, topic?: string) {
    const value = text.trim();
    if (busy || clearing || loadingHistory || !value) return;
    const temporaryId = "sending-" + Date.now();
    setMessage("");
    setErrorText("");
    setBusy(true);
    setOptionsOpen(false);
    setMessages(existing => [...existing, { id: temporaryId, by: "user", text: value }]);
    try {
      const response = await fetch(CHAT_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: value, topic,
          farmId: farmId || undefined,
          minWeightKg: Number(weight),
        }),
        cache: "no-store",
      });
      const data = await response.json() as Reply & { error?: string };
      if (!response.ok) throw new Error(data.error || "No se pudo completar la consulta.");
      if (Array.isArray(data.farms)) setFarms(data.farms);
      if (data.mode === "asistido" || data.mode === "generativo") setMode(data.mode);
      setMessages(existing => [...existing, { by: "assistant", text: data.reply }]);
    } catch (error) {
      setMessages(existing => existing.filter(turn => turn.id !== temporaryId));
      setMessage(value);
      setErrorText(error instanceof Error ? error.message : "No se pudo completar la consulta.");
    } finally {
      setBusy(false);
    }
  }

  async function clearChat() {
    if (busy || clearing || loadingHistory) return;
    setClearing(true);
    setErrorText("");
    try {
      const response = await fetch(HISTORY_PATH, { method: "DELETE", cache: "no-store" });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "No se pudo limpiar la conversación.");
      setMessages([]);
      setHasMore(false);
      setCursor(null);
      setConfirmClear(false);
      setOptionsOpen(false);
      setMode(null);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "No se pudo limpiar la conversación.");
      setConfirmClear(false);
    } finally {
      setClearing(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir GanadIA AI"
        title="Hablar con GanadIA AI"
        className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-4 z-40 flex size-14 items-center justify-center rounded-full bg-[#234a34] text-white shadow-xl ring-2 ring-[#d0ba80] lg:bottom-7 lg:right-7"
      >
        <Bot className="size-7" aria-hidden="true" />
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-end bg-[#14271c]/55 lg:p-5">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Conversación con GanadIA AI"
            className="relative flex h-[100dvh] max-h-[100dvh] w-full min-h-0 flex-col overflow-hidden bg-[#fbfcfa] shadow-2xl lg:h-[min(820px,92dvh)] lg:max-w-[500px] lg:rounded-3xl"
          >
            <header className="shrink-0 bg-[#234a34] px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
              <div className="flex items-center gap-3">
                <Sparkles className="size-7 shrink-0 text-[#e9d49c]" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-lg font-semibold leading-tight">GanadIA AI</h2>
                  <p className="mt-0.5 text-xs text-white/80">Tu asistente ganadero</p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  disabled={busy || clearing || loadingHistory || messages.length === 0}
                  title="Limpiar conversación"
                  aria-label="Limpiar conversación"
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl hover:bg-white/15 disabled:opacity-40"
                >
                  <Trash2 className="size-[19px]" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar conversación"
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl hover:bg-white/15"
                >
                  <X className="size-6" aria-hidden="true" />
                </button>
              </div>
            </header>

            <div className="flex shrink-0 items-center gap-2 border-b border-[#e6ebe5] bg-[#f2f6f0] px-4 py-2 text-xs text-[#47624c]">
              <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                {mode === "generativo"
                  ? "Conversación con inteligencia artificial · historial guardado"
                  : "Tu conversación se guarda en tu cuenta"}
              </span>
            </div>

            <div
              ref={scrollRef}
              className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5"
              aria-label="Mensajes de GanadIA"
              aria-live="polite"
            >
              {loadingHistory ? (
                <p className="flex items-center justify-center gap-2 py-8 text-sm text-[#607361]">
                  <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
                  Recuperando conversación...
                </p>
              ) : (
                <>
                  {hasMore && (
                    <button
                      type="button"
                      disabled={loadingOlder || busy}
                      onClick={() => void showOlder()}
                      className="mx-auto flex items-center gap-2 rounded-full border border-[#d3ded1] bg-white px-4 py-2 text-xs font-medium text-[#315239] disabled:opacity-50"
                    >
                      {loadingOlder && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                      Ver mensajes anteriores
                    </button>
                  )}
                  {messages.length === 0 && (
                    <div className="mx-auto mt-7 max-w-[340px] space-y-3 rounded-2xl bg-[#eff5ed] p-5 text-center text-[#274431]">
                      <MessageSquareText className="mx-auto size-8 text-[#50765b]" aria-hidden="true" />
                      <p className="text-[15px] leading-6">{HELLO}</p>
                    </div>
                  )}
                  {messages.map((entry, i) => (
                    <div
                      key={entry.id || String(i)}
                      className={
                        "w-fit max-w-[94%] break-words whitespace-pre-wrap rounded-2xl px-4 py-3 text-[15px] leading-[1.65] " +
                        (entry.by === "user"
                          ? "ml-auto bg-[#e3efe1] text-[#203d28]"
                          : "mr-auto bg-white text-[#233a2a] shadow-sm ring-1 ring-[#e7ece5]")
                      }
                    >
                      {entry.text}
                    </div>
                  ))}
                  {busy && (
                    <p className="flex items-center gap-2 py-2 text-sm text-[#607361]">
                      <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                      GanadIA está revisando tu consulta...
                    </p>
                  )}
                  <div ref={endRef} aria-hidden="true" />
                </>
              )}
            </div>

            <div className="z-10 shrink-0 border-t border-[#e4eae3] bg-white px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-6px_20px_rgba(10,30,14,0.03)] sm:px-4">
              {errorText && (
                <p role="alert" className="mb-2 rounded-lg bg-[#fff5e8] px-3 py-2 text-xs leading-5 text-[#784917]">
                  {errorText}
                </p>
              )}
              <button
                type="button"
                onClick={() => setOptionsOpen(!optionsOpen)}
                aria-expanded={optionsOpen}
                aria-controls="ganadia-chat-options"
                className="mb-2 flex min-h-8 w-full items-center gap-2 rounded-lg px-2 text-xs font-medium text-[#4c6551] hover:bg-[#f2f6f0]"
              >
                <SlidersHorizontal className="size-4" aria-hidden="true" />
                <span className="flex-1 text-left">Finca, peso y consultas rápidas</span>
                {optionsOpen
                  ? <ChevronDown className="size-4" aria-hidden="true" />
                  : <ChevronUp className="size-4 rotate-180" aria-hidden="true" />}
              </button>
              {optionsOpen && (
                <div id="ganadia-chat-options" className="mb-3 max-h-[min(42dvh,330px)] space-y-3 overflow-y-auto rounded-xl border border-[#e2e9df] bg-[#f7faf6] p-3">
                  <label className="block text-xs font-medium text-[#385344]">
                    Finca
                    <select
                      value={farmId}
                      onChange={event => setFarmId(event.target.value)}
                      className="mt-1 min-h-11 w-full rounded-lg border border-[#cfdacb] bg-white px-3 text-sm"
                    >
                      <option value="">Todas mis fincas autorizadas</option>
                      {farms.map(farm => (
                        <option key={farm.id} value={farm.id}>{farm.name}</option>
                      ))}
                    </select>
                  </label>
                  {!financeOnly && !veterinaryOnly && (
                    <label className="flex items-center justify-between gap-3 text-xs font-medium text-[#385344]">
                      Peso mínimo para venta (kg)
                      <input
                        aria-label="Peso mínimo para preselección de venta"
                        className="h-10 w-24 rounded-lg border border-[#cfdacb] bg-white px-3 text-sm"
                        min="1"
                        max="2000"
                        type="number"
                        value={weight}
                        onChange={event => setWeight(event.target.value)}
                      />
                    </label>
                  )}
                  <div className="flex flex-wrap gap-2" aria-label="Consultas rápidas">
                    {topics.map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        disabled={busy || clearing || loadingHistory}
                        onClick={() => void send(
                          label === "Preparar venta"
                            ? "Preseleccionar animales de al menos " + weight + " kg"
                            : label,
                          id,
                        )}
                        className="min-h-10 rounded-full border border-[#c5d3c6] bg-white px-3 text-xs font-semibold text-[#21442a] disabled:opacity-50"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <form
                onSubmit={event => {
                  event.preventDefault();
                  void send(message);
                }}
                className="flex items-end gap-2"
              >
                <textarea
                  ref={textareaRef}
                  rows={1}
                  maxLength={700}
                  value={message}
                  onChange={event => setMessage(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                      event.preventDefault();
                      void send(message);
                    }
                  }}
                  placeholder="Pregúntale a GanadIA..."
                  aria-label="Escribe tu mensaje para GanadIA"
                  className="max-h-28 min-h-12 flex-1 resize-none overflow-y-auto rounded-2xl border border-[#c9d6c9] bg-[#fbfcfa] px-4 py-3 text-base outline-none focus:border-[#234a34]"
                />
                <button
                  type="submit"
                  disabled={busy || clearing || loadingHistory || !message.trim()}
                  aria-label="Enviar mensaje"
                  className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#234a34] text-white disabled:bg-[#a7b9ad]"
                >
                  {busy
                    ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
                    : <Send className="size-5" aria-hidden="true" />}
                </button>
              </form>
            </div>

            {confirmClear && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#112d1b]/60 px-5">
                <div role="alertdialog" aria-modal="true" aria-labelledby="ganadia-clear-title" aria-describedby="ganadia-clear-desc" className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-5 shadow-xl">
                  <h3 id="ganadia-clear-title" className="text-lg font-semibold text-[#243e2c]">¿Limpiar esta conversación?</h3>
                  <p id="ganadia-clear-desc" className="text-sm leading-6 text-[#526454]">
                    Se borrarán los mensajes guardados de este chat. Tus fincas, animales y demás registros no se modificarán.
                  </p>
                  <div className="flex justify-end gap-3">
                    <button type="button" disabled={clearing} onClick={() => setConfirmClear(false)} className="min-h-11 rounded-lg border border-[#d5dfd2] px-4 text-sm text-[#35513d]">Cancelar</button>
                    <button type="button" disabled={clearing} onClick={() => void clearChat()} className="min-h-11 rounded-lg bg-[#9c372e] px-4 text-sm font-semibold text-white disabled:opacity-60">
                      {clearing ? "Limpiando..." : "Sí, limpiar"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
