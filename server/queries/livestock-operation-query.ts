import { normalizeAnimalCode } from "@/lib/utils";
import { listFarmsByTenant } from "@/server/repositories/farm-repository";
import { listAnimalsByTenant } from "@/server/repositories/livestock-repository";
import {
  findLivestockOperationById,
  listEmployeesByTenant,
  listLivestockOperationsByTenant,
} from "@/server/repositories/livestock-operation-repository";

function decimalToString(value: { toString(): string } | null | undefined) {
  return value ? value.toString() : null;
}

export async function getLivestockOperationsIndexData(tenantId: string) {
  const [operations, farms, animals] = await Promise.all([
    listLivestockOperationsByTenant(tenantId),
    listFarmsByTenant(tenantId),
    listAnimalsByTenant(tenantId),
  ]);

  return {
    metrics: {
      totalOperations: operations.length,
      pendingApplication: operations.filter((operation) => operation.status === "RESULTS_CAPTURED").length,
      planned: operations.filter((operation) => ["DRAFT", "SHEETS_READY"].includes(operation.status)).length,
      completed: operations.filter((operation) => operation.status === "APPLIED").length,
      totalSheets: operations.reduce(
        (sum, operation) => sum + operation.sheets.length,
        0,
      ),
      totalTrackedAnimals: operations.reduce(
        (sum, operation) => sum + operation.animals.length,
        0,
      ),
    },
    operations: operations.map((operation) => ({
      id: operation.id,
      title: operation.title,
      farmName: operation.farm.name,
      status: operation.status,
      operationDateIso: operation.operationDate.toISOString(),
      plannedTypes: operation.plannedTypes,
      animalsCount: operation.animals.length,
      expensesCount: operation.expenses.length,
      workersCount: operation.workers.length,
    })),
    farms: farms.map((farm) => ({
      id: farm.id,
      name: farm.name,
    })),
    animals: animals.map((animal) => ({
      id: animal.id,
      internalCode: animal.internalCode,
      visualIdentification: animal.visualIdentification,
      farmId: animal.farmId,
      farmName: animal.farm.name,
    })),
  };
}

export async function getLivestockOperationDetailData(
  tenantId: string,
  operationId: string,
  lookupCode?: string,
) {
  const [operation, employees] = await Promise.all([
    findLivestockOperationById(operationId),
    listEmployeesByTenant(tenantId),
  ]);

  if (!operation || operation.tenantId !== tenantId) {
    return null;
  }

  const normalizedLookup = lookupCode ? normalizeAnimalCode(lookupCode) : "";
  const matchedOperationAnimal = normalizedLookup
    ? operation.animals.find((item) => {
        const candidates = [
          item.internalCodeSnapshot,
          item.visualIdentificationSnapshot ?? "",
          item.animal.internalCode,
          item.animal.visualIdentification ?? "",
          item.animal.chipCode ?? "",
        ].map(normalizeAnimalCode);

        return candidates.includes(normalizedLookup);
      }) ?? null
    : null;

  return {
    operation: {
      id: operation.id,
      title: operation.title,
      farmName: operation.farm.name,
      farmId: operation.farmId,
      operationDateIso: operation.operationDate.toISOString(),
      status: operation.status,
      plannedTypes: operation.plannedTypes,
      notes: operation.notes,
      resultsAppliedAtIso: operation.resultsAppliedAt?.toISOString() ?? null,
      includeAllFarmAnimals: operation.includeAllFarmAnimals,
    },
    sheets: operation.sheets.map((sheet) => ({
      id: sheet.id,
      fileId: sheet.fileId,
      type: sheet.type,
      source: sheet.source,
      label: sheet.label,
      version: sheet.version,
      url: null,
      createdAtIso: sheet.createdAt.toISOString(),
    })),
    animals: operation.animals.map((row) => ({
      id: row.id,
      animalId: row.animalId,
      internalCode: row.internalCodeSnapshot,
      visualIdentification: row.visualIdentificationSnapshot,
      lotOrZone: row.lotOrZoneSnapshot,
      speciesName: row.animal.species.name,
      breedName: row.animal.breed?.name ?? null,
      status: row.status,
      generalStatus: row.generalStatus,
      weightKg: decimalToString(row.weightKg),
      vaccineName: row.vaccineName,
      dewormingName: row.dewormingName,
      treatmentName: row.treatmentName,
      observations: row.observations,
      currentWeightKg: decimalToString(row.animal.currentWeightKg),
      appliedToAnimalHistory: row.appliedToAnimalHistory,
    })),
    expenses: operation.expenses.map((expense) => ({
      id: expense.id,
      label: expense.label,
      amount: expense.amount.toString(),
      notes: expense.notes,
    })),
    workers: operation.workers.map((worker) => ({
      id: worker.id,
      fullName: worker.fullName,
      role: worker.role,
      employeeName: worker.employee?.fullName ?? null,
      notes: worker.notes,
    })),
    employees: employees.map((employee) => ({
      id: employee.id,
      fullName: employee.fullName,
    })),
    lookup: {
      raw: lookupCode ?? "",
      normalized: normalizedLookup,
      match: matchedOperationAnimal
        ? {
            operationAnimalId: matchedOperationAnimal.id,
            internalCode: matchedOperationAnimal.internalCodeSnapshot,
            visualIdentification:
              matchedOperationAnimal.visualIdentificationSnapshot,
            currentWeightKg:
              decimalToString(matchedOperationAnimal.animal.currentWeightKg) ?? "",
            status: matchedOperationAnimal.status,
          }
        : null,
    },
  };
}
