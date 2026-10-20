-- GanadIA: planificar potreros por fundacion sin alterar los registros existentes.
ALTER TABLE "FarmGeoArea" DROP CONSTRAINT IF EXISTS "FarmGeoArea_kind_check";
ALTER TABLE "FarmGeoArea" ADD CONSTRAINT "FarmGeoArea_kind_check"
  CHECK ("kind" IN ('BOUNDARY','FOUNDATION','PADDOCK'));
CREATE TABLE IF NOT EXISTS "FarmGrazingPlan" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "farmId" TEXT NOT NULL REFERENCES "Farm"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "input" JSONB NOT NULL,
  "output" JSONB NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "FarmGrazingPlan_tenantId_farmId_createdAt_idx" ON "FarmGrazingPlan"("tenantId","farmId","createdAt");
