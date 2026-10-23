import { prisma } from "@/lib/db/prisma";
import type { AiContext } from "@/lib/ai/ganadia-tools";
import {
  ganadiaConversationScope,
  type GanadiaMemoryTurn,
} from "@/lib/ai/ganadia-memory-policy";

const PAGE_SIZE = 40;
const MODEL_HISTORY_ROWS = 16;

function identity(ctx: AiContext) {
  return {
    tenantId: ctx.ctx.tenant.id,
    userId: ctx.ctx.user.id,
    accessHash: ganadiaConversationScope({
      tenantId: ctx.ctx.tenant.id,
      userId: ctx.ctx.user.id,
      role: ctx.ctx.membership.role,
      authorizedFarmIds: ctx.farms.map(farm => farm.id),
    }),
  };
}

export async function getGanadiaChatPage(ctx: AiContext, before?: string | null) {
  const key = identity(ctx);
  const conversation = await prisma.ganadiaAiConversation.findUnique({
    where: { tenantId_userId_accessHash: key },
    select: { id: true },
  });
  if (!conversation) {
    if (before) throw new Error("INVALID_CHAT_CURSOR");
    return { messages: [], hasMore: false, nextCursor: null };
  }
  if (before) {
    if (before.length > 120 || !/^[a-zA-Z0-9_-]+$/.test(before)) {
      throw new Error("INVALID_CHAT_CURSOR");
    }
    const ownsCursor = await prisma.ganadiaAiMessage.count({
      where: { id: before, conversationId: conversation.id },
    });
    if (ownsCursor !== 1) throw new Error("INVALID_CHAT_CURSOR");
  }
  const rows = await prisma.ganadiaAiMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { sequence: "desc" },
    cursor: before ? { id: before } : undefined,
    skip: before ? 1 : 0,
    take: PAGE_SIZE + 1,
    select: { id: true, role: true, content: true },
  });
  const hasMore = rows.length > PAGE_SIZE;
  const page = rows.slice(0, PAGE_SIZE);
  return {
    messages: page.reverse().map(row => ({
      id: row.id,
      by: row.role === "assistant" ? "assistant" as const : "user" as const,
      text: row.content,
    })),
    hasMore,
    nextCursor: hasMore ? page[0]?.id ?? null : null,
  };
}

export async function beginGanadiaChatTurn(ctx: AiContext): Promise<{
  id: string;
  generation: number;
  history: GanadiaMemoryTurn[];
}> {
  const key = identity(ctx);
  const conversation = await prisma.ganadiaAiConversation.upsert({
    where: { tenantId_userId_accessHash: key },
    create: key,
    update: {},
    select: { id: true, generation: true },
  });
  const rows = await prisma.ganadiaAiMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { sequence: "desc" },
    take: MODEL_HISTORY_ROWS,
    select: { role: true, content: true },
  });
  return {
    id: conversation.id,
    generation: conversation.generation,
    history: rows.reverse().map(row => ({
      role: row.role === "assistant" ? "assistant" : "user",
      content: row.content,
    })),
  };
}

/**
 * Atomic, ordered two-message append. generation fences a request in flight
 * when the user clears the chat on another tab or device.
 */
export async function appendGanadiaChatTurn(
  ctx: AiContext,
  snapshot: { id: string; generation: number },
  userMessage: string,
  assistantReply: string,
): Promise<boolean> {
  if (!userMessage.trim() || userMessage.length > 700 ||
      !assistantReply.trim() || assistantReply.length > 10000) {
    throw new Error("INVALID_CHAT_MESSAGE");
  }
  const key = identity(ctx);
  return prisma.$transaction(async tx => {
    const locked = await tx.ganadiaAiConversation.updateMany({
      where: { ...key, id: snapshot.id, generation: snapshot.generation },
      data: { updatedAt: new Date() },
    });
    if (!locked.count) return false;
    await tx.ganadiaAiMessage.createMany({
      data: [
        { conversationId: snapshot.id, role: "user", content: userMessage },
        { conversationId: snapshot.id, role: "assistant", content: assistantReply },
      ],
    });
    return true;
  }, { maxWait: 10_000, timeout: 10_000 });
}

/** Only this user's current authorized chat is deleted, never their ERP data. */
export async function clearGanadiaChat(ctx: AiContext) {
  const key = identity(ctx);
  const conversation = await prisma.ganadiaAiConversation.findUnique({
    where: { tenantId_userId_accessHash: key },
    select: { id: true },
  });
  if (!conversation) return;
  await prisma.$transaction(async tx => {
    await tx.ganadiaAiConversation.updateMany({
      where: { ...key, id: conversation.id },
      data: { generation: { increment: 1 } },
    });
    await tx.ganadiaAiMessage.deleteMany({
      where: { conversationId: conversation.id },
    });
  }, { maxWait: 10_000, timeout: 10_000 });
}
