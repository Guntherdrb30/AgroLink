-- GanadIA Crea tu Finca (additive) - preserving all operational records.
CREATE TABLE "FarmSetupSession" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
 "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
 "status" VARCHAR(16) NOT NULL DEFAULT 'COLLECTING',
 "step" VARCHAR(24) NOT NULL DEFAULT 'vision',
 "answers" JSONB NOT NULL DEFAULT '{}'::jsonb,
 "messages" JSONB NOT NULL DEFAULT '[]'::jsonb,
 "proposal" JSONB,
 "proposalSource" VARCHAR(16),
 "version" INTEGER NOT NULL DEFAULT 0,
 "createdFarmId" TEXT REFERENCES "Farm"("id") ON DELETE SET NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "FarmSetupSession_status_check" CHECK ("status" IN ('COLLECTING','REVIEW','APPLIED')),
 CONSTRAINT "FarmSetupSession_step_check" CHECK ("step" IN ('vision','name','location','hectares','purpose','herd','land','goals','review','done'))
);
CREATE UNIQUE INDEX "FarmSetupSession_tenantId_userId_key" ON "FarmSetupSession"("tenantId","userId");
CREATE INDEX "FarmSetupSession_tenantId_status_idx" ON "FarmSetupSession"("tenantId","status");
CREATE TABLE "FarmProductionProfile" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
 "farmId" TEXT NOT NULL REFERENCES "Farm"("id") ON DELETE CASCADE,
 "purpose" VARCHAR(24) NOT NULL,
 "answers" JSONB NOT NULL,
 "recommendedModules" JSONB NOT NULL,
 "futureModules" JSONB NOT NULL,
 "recommendations" JSONB NOT NULL,
 "warnings" JSONB NOT NULL,
 "proposalSource" VARCHAR(16) NOT NULL,
 "approvedById" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
 "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "FarmProductionProfile_purpose_check" CHECK ("purpose" IN ('CRIA','ENGORDE','LECHERIA','DOBLE_PROPOSITO','AGRICULTURA','AGROPECUARIA','OTRO'))
);
CREATE UNIQUE INDEX "FarmProductionProfile_farmId_key" ON "FarmProductionProfile"("farmId");
CREATE INDEX "FarmProductionProfile_tenantId_purpose_idx" ON "FarmProductionProfile"("tenantId","purpose");
