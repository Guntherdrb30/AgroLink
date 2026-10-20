CREATE TABLE IF NOT EXISTS "FarmGeoArea" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "farmId" TEXT NOT NULL REFERENCES "Farm"("id") ON DELETE CASCADE,
  "kind" TEXT NOT NULL CHECK ("kind" IN ('BOUNDARY','PADDOCK')),
  "name" TEXT NOT NULL,
  "coordinates" JSONB NOT NULL,
  "areaHectares" DECIMAL(14,4) NOT NULL CHECK ("areaHectares" > 0),
  "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version" >= 1),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "FarmGeoArea_farmId_kind_name_key" ON "FarmGeoArea"("farmId","kind","name");
CREATE INDEX IF NOT EXISTS "FarmGeoArea_tenantId_farmId_kind_idx" ON "FarmGeoArea"("tenantId","farmId","kind");
CREATE UNIQUE INDEX IF NOT EXISTS "FarmGeoArea_single_boundary_per_farm" ON "FarmGeoArea"("farmId") WHERE "kind" = 'BOUNDARY';