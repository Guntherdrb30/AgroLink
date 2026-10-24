ALTER TYPE "FileUsage" ADD VALUE IF NOT EXISTS 'SALE_PERMIT';
CREATE TYPE "LivestockInventoryStatus" AS ENUM ('ACTIVE','SOLD');
ALTER TABLE "Animal" ADD COLUMN "inventoryStatus" "LivestockInventoryStatus" NOT NULL DEFAULT 'ACTIVE', ADD COLUMN "soldAt" TIMESTAMP(3);
CREATE TABLE "LivestockSale" (
"id" TEXT PRIMARY KEY,"tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE RESTRICT,
"farmId" TEXT NOT NULL REFERENCES "Farm"("id") ON DELETE RESTRICT,
"number" TEXT NOT NULL,"status" TEXT NOT NULL DEFAULT 'DRAFT',
"buyerName" TEXT NOT NULL,"buyerDocument" TEXT,"destination" TEXT,"saleDate" TIMESTAMP(3) NOT NULL,
"currency" TEXT NOT NULL,"pricePerKgCents" INTEGER NOT NULL,"totalWeightKg" DECIMAL(12,2) NOT NULL,
"totalCents" INTEGER NOT NULL,"notes" TEXT,"requestKey" TEXT NOT NULL,
"createdById" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
"confirmedById" TEXT REFERENCES "User"("id") ON DELETE RESTRICT,"confirmedAt" TIMESTAMP(3),
"insaiPermitNumber" TEXT,"insaiPermitFileId" TEXT,"insaiPermitAttachedAt" TIMESTAMP(3),
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT "sale_status" CHECK ("status" IN ('DRAFT','CONFIRMED')),
CONSTRAINT "sale_currency" CHECK ("currency" IN ('USD','VES')),
CONSTRAINT "sale_positive" CHECK ("pricePerKgCents">=0 AND "totalCents">=0 AND "totalWeightKg">0)
);
CREATE UNIQUE INDEX "LivestockSale_tenantId_number_key" ON "LivestockSale"("tenantId","number");
CREATE UNIQUE INDEX "LivestockSale_tenantId_requestKey_key" ON "LivestockSale"("tenantId","requestKey");
CREATE INDEX "LivestockSale_tenantId_farmId_createdAt_idx" ON "LivestockSale"("tenantId","farmId","createdAt");
CREATE INDEX "LivestockSale_tenantId_status_idx" ON "LivestockSale"("tenantId","status");
CREATE TABLE "LivestockSaleItem"(
"id" TEXT PRIMARY KEY,"tenantId" TEXT NOT NULL,
"saleId" TEXT NOT NULL REFERENCES "LivestockSale"("id") ON DELETE RESTRICT,
"animalId" TEXT NOT NULL REFERENCES "Animal"("id") ON DELETE RESTRICT,
"codeSnapshot" TEXT NOT NULL,"sexSnapshot" TEXT NOT NULL,
"weightKg" DECIMAL(10,2) NOT NULL,"weightSource" TEXT NOT NULL,
"lastWeighedAt" TIMESTAMP(3),"subtotalCents" INTEGER NOT NULL,
CONSTRAINT "sale_item_weight" CHECK("weightKg">0 AND "subtotalCents">=0),
CONSTRAINT "sale_item_source" CHECK("weightSource" IN ('LAST_WEIGHING','DECLARED'))
);
CREATE UNIQUE INDEX "LivestockSaleItem_saleId_animalId_key" ON "LivestockSaleItem"("saleId","animalId");
CREATE INDEX "LivestockSaleItem_tenantId_animalId_idx" ON "LivestockSaleItem"("tenantId","animalId");
CREATE INDEX "Animal_tenantId_farmId_inventoryStatus_idx" ON "Animal"("tenantId","farmId","inventoryStatus");
