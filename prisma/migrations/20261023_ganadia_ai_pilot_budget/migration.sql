-- Pilot ledger: additive migration; does not enable OpenAI requests.
CREATE TABLE IF NOT EXISTS "GanadiaAiPilotBudget" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "spentMicroUsd" INTEGER NOT NULL DEFAULT 0,
  "reservedMicroUsd" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GanadiaAiPilotBudget_nonnegative" CHECK ("spentMicroUsd" >= 0 AND "reservedMicroUsd" >= 0)
);

CREATE TABLE IF NOT EXISTS "GanadiaAiPilotAttempt" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'RESERVED',
  "reservedMicroUsd" INTEGER NOT NULL,
  "billedMicroUsd" INTEGER NOT NULL DEFAULT 0,
  "inputTokens" INTEGER,
  "outputTokens" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GanadiaAiPilotAttempt_valid_amounts" CHECK ("reservedMicroUsd" > 0 AND "billedMicroUsd" >= 0),
  CONSTRAINT "GanadiaAiPilotAttempt_valid_status" CHECK ("status" IN ('RESERVED', 'SETTLED', 'UNKNOWN'))
);

CREATE INDEX IF NOT EXISTS "GanadiaAiPilotAttempt_userId_status_idx"
  ON "GanadiaAiPilotAttempt"("userId", "status");
CREATE INDEX IF NOT EXISTS "GanadiaAiPilotAttempt_tenantId_createdAt_idx"
  ON "GanadiaAiPilotAttempt"("tenantId", "createdAt");

INSERT INTO "GanadiaAiPilotBudget" ("id", "spentMicroUsd", "reservedMicroUsd")
VALUES ('ganadia-ai-pilot-v1', 0, 0) ON CONFLICT ("id") DO NOTHING;
