-- Additive GanadIA AI memory migration. No user, conversation, sale or livestock data is removed.
CREATE TABLE "GanadiaAiMemorySettings" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
 "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
 "enabled" BOOLEAN NOT NULL DEFAULT FALSE,
 "learnFromChat" BOOLEAN NOT NULL DEFAULT FALSE,
 "preferredName" VARCHAR(80),
 "responseStyle" VARCHAR(16) NOT NULL DEFAULT 'BALANCED',
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "GanadiaAiMemorySettings_style_check" CHECK ("responseStyle" IN ('SHORT','BALANCED','DETAILED')),
 CONSTRAINT "GanadiaAiMemorySettings_consent_check" CHECK ("enabled" OR NOT "learnFromChat")
);
CREATE UNIQUE INDEX "GanadiaAiMemorySettings_tenantId_userId_key" ON "GanadiaAiMemorySettings" ("tenantId","userId");
CREATE INDEX "GanadiaAiMemorySettings_userId_updatedAt_idx" ON "GanadiaAiMemorySettings" ("userId","updatedAt");
CREATE TABLE "GanadiaAiMemoryFact" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
 "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
 "farmId" TEXT,
 "kind" VARCHAR(40) NOT NULL,
 "content" VARCHAR(350) NOT NULL,
 "status" VARCHAR(20) NOT NULL DEFAULT 'SUGGESTED',
 "origin" VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
 "evidenceCount" INTEGER NOT NULL DEFAULT 1,
 "expiresAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "GanadiaAiMemoryFact_status_check" CHECK ("status" IN ('SUGGESTED','ACTIVE','DISMISSED')),
 CONSTRAINT "GanadiaAiMemoryFact_origin_check" CHECK ("origin" IN ('MANUAL','EXPLICIT','PATTERN','OPENAI')),
 CONSTRAINT "GanadiaAiMemoryFact_evidence_check" CHECK ("evidenceCount">=1)
);
CREATE INDEX "GanadiaAiMemoryFact_tenantId_userId_status_idx" ON "GanadiaAiMemoryFact" ("tenantId","userId","status");
CREATE INDEX "GanadiaAiMemoryFact_tenantId_userId_farmId_idx" ON "GanadiaAiMemoryFact" ("tenantId","userId","farmId");
CREATE TABLE "GanadiaAiOrganizationMemory" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
 "farmId" TEXT,
 "content" VARCHAR(350) NOT NULL,
 "createdById" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "GanadiaAiOrganizationMemory_tenantId_farmId_idx" ON "GanadiaAiOrganizationMemory" ("tenantId","farmId");
CREATE TABLE "GanadiaAiUsagePattern" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
 "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
 "patternKey" VARCHAR(50) NOT NULL,
 "occurrences" INTEGER NOT NULL DEFAULT 0,
 "activeDays" INTEGER NOT NULL DEFAULT 0,
 "lastDay" VARCHAR(10) NOT NULL DEFAULT '',
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "GanadiaAiUsagePattern_tenantId_userId_patternKey_key" ON "GanadiaAiUsagePattern" ("tenantId","userId","patternKey");
