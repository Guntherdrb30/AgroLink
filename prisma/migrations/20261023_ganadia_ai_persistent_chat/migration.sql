-- Additive schema for user-scoped GanadIA conversation persistence.
-- Safe for existing fictional ERP, farm and account records.
CREATE TABLE IF NOT EXISTS "GanadiaAiConversation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "accessHash" VARCHAR(64) NOT NULL,
  "generation" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GanadiaAiConversation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "GanadiaAiConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "GanadiaAiConversation_generation_check" CHECK ("generation" >= 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS "GanadiaAiConversation_tenantId_userId_accessHash_key"
  ON "GanadiaAiConversation"("tenantId", "userId", "accessHash");
CREATE INDEX IF NOT EXISTS "GanadiaAiConversation_userId_updatedAt_idx"
  ON "GanadiaAiConversation"("userId", "updatedAt");
CREATE TABLE IF NOT EXISTS "GanadiaAiMessage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sequence" BIGSERIAL NOT NULL,
  "conversationId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GanadiaAiMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "GanadiaAiConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "GanadiaAiMessage_role_check" CHECK ("role" IN ('user', 'assistant')),
  CONSTRAINT "GanadiaAiMessage_content_check" CHECK (char_length("content") BETWEEN 1 AND 10000)
);
CREATE UNIQUE INDEX IF NOT EXISTS "GanadiaAiMessage_sequence_key" ON "GanadiaAiMessage"("sequence");
CREATE INDEX IF NOT EXISTS "GanadiaAiMessage_conversationId_sequence_idx"
  ON "GanadiaAiMessage"("conversationId", "sequence");
