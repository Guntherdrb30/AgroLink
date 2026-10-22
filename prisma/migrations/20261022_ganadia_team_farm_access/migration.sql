ALTER TYPE "TenantRole" ADD VALUE IF NOT EXISTS 'VETERINARIAN';
CREATE TABLE IF NOT EXISTS "TenantFarmAccess" ("id" TEXT PRIMARY KEY, "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE, "farmId" TEXT NOT NULL REFERENCES "Farm"("id") ON DELETE CASCADE, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX IF NOT EXISTS "TenantFarmAccess_tenantId_userId_farmId_key" ON "TenantFarmAccess"("tenantId","userId","farmId");
CREATE INDEX IF NOT EXISTS "TenantFarmAccess_tenantId_farmId_idx" ON "TenantFarmAccess"("tenantId","farmId");
CREATE TABLE IF NOT EXISTS "TenantInvitation" ("id" TEXT PRIMARY KEY, "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE, "email" TEXT NOT NULL, "role" "TenantRole" NOT NULL, "farmIds" JSONB NOT NULL, "tokenHash" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING', "createdById" TEXT NOT NULL, "acceptedById" TEXT, "acceptedAt" TIMESTAMP(3), "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX IF NOT EXISTS "TenantInvitation_tokenHash_key" ON "TenantInvitation"("tokenHash");
CREATE INDEX IF NOT EXISTS "TenantInvitation_tenantId_status_expiresAt_idx" ON "TenantInvitation"("tenantId","status","expiresAt");
CREATE INDEX IF NOT EXISTS "TenantInvitation_tenantId_email_idx" ON "TenantInvitation"("tenantId","email");

CREATE TABLE "VeterinaryProfessionalProfile" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
 "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
 "fullName" TEXT NOT NULL,
 "licenseNumber" TEXT NOT NULL,
 "registrationAuthority" TEXT,
 "specialty" TEXT,
 "phone" TEXT,
 "updatedById" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "VeterinaryProfessionalProfile_tenantId_userId_key" ON "VeterinaryProfessionalProfile"("tenantId","userId");
CREATE INDEX "VeterinaryProfessionalProfile_tenantId_licenseNumber_idx" ON "VeterinaryProfessionalProfile"("tenantId","licenseNumber");
ALTER TABLE "AnimalVaccinationRecord" ADD COLUMN "veterinaryProfileId" TEXT;
ALTER TABLE "AnimalTreatmentRecord" ADD COLUMN "veterinaryProfileId" TEXT;
ALTER TABLE "AnimalVaccinationRecord" ADD CONSTRAINT "AnimalVaccinationRecord_veterinaryProfileId_fkey" FOREIGN KEY ("veterinaryProfileId") REFERENCES "VeterinaryProfessionalProfile"("id") ON DELETE SET NULL;
ALTER TABLE "AnimalTreatmentRecord" ADD CONSTRAINT "AnimalTreatmentRecord_veterinaryProfileId_fkey" FOREIGN KEY ("veterinaryProfileId") REFERENCES "VeterinaryProfessionalProfile"("id") ON DELETE SET NULL;
