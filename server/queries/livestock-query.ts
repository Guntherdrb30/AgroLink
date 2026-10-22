import { isReproductionMetadata, getNextReproductionCheck, type ReproductionRecord } from "@/lib/livestock/reproduction";
import type {
  AnimalHealthStatus,
  AnimalProductiveLine,
  AnimalReproductiveStatus,
  AnimalSex,
} from "@prisma/client";

import { listFarmsByTenant } from "@/server/repositories/farm-repository";
import {
  listFilesByEntity,
  listFilesForEntities,
} from "@/server/repositories/file-storage-repository";
import {
  findAnimalById,
  listAnimalsByTenant,
  listAnimalsForRelations,
} from "@/server/repositories/livestock-repository";

function decimalToString(value: { toString(): string } | null | undefined) {
  return value ? value.toString() : null;
}

function toDateInput(date: Date | null | undefined) {
  return date ? date.toISOString().slice(0, 10) : "";
}

function toTimelineDate(date: Date) {
  return date.toISOString();
}

export async function getLivestockIndexData(tenantId: string, granted: string[] | null = null) {
  const [allAnimals, allFarms, allRelationAnimals] = await Promise.all([
    listAnimalsByTenant(tenantId),
    listFarmsByTenant(tenantId),
    listAnimalsForRelations(tenantId),
  ]);

  const animals=allAnimals.filter(a=>!granted||granted.includes(a.farmId));
  const farms=allFarms.filter(f=>!granted||granted.includes(f.id));
  const permittedAnimalIds=new Set(animals.map(a=>a.id));
  const relationAnimals=allRelationAnimals.filter(a=>permittedAnimalIds.has(a.id));
  const files = await listFilesForEntities(
    "animal",
    animals.map((animal) => animal.id),
  );
  const firstPhotoByAnimalId = new Map<string, string>();

  for (const file of files) {
    if (file.entityId && !firstPhotoByAnimalId.has(file.entityId)) {
      firstPhotoByAnimalId.set(file.entityId, file.url);
    }
  }

  return {
    metrics: {
      totalAnimals: animals.length,
      activeFarms: new Set(animals.map((animal) => animal.farmId)).size,
      healthyAnimals: animals.filter((animal) => animal.healthStatus === "HEALTHY")
        .length,
      breedingAnimals: animals.filter(
        (animal) => animal.productiveLine === "BREEDING",
      ).length,
    },
    animals: animals.map((animal) => ({
      id: animal.id,
      internalCode: animal.internalCode,
      birthDate: animal.birthDate?.toISOString().slice(0, 10) ?? null,
      estimatedAgeMonths: animal.estimatedAgeMonths,
      visualIdentification: animal.visualIdentification,
      speciesName: animal.species.name,
      breedName: animal.breed?.name ?? null,
      sex: animal.sex,
      farmName: animal.farm.name,
      lotOrZone: animal.lotOrZone,
      productiveLine: animal.productiveLine,
      currentWeightKg: decimalToString(animal.currentWeightKg),
      healthStatus: animal.healthStatus,
      reproductiveStatus: animal.reproductiveStatus,
      origin: animal.origin,
      photoUrl: firstPhotoByAnimalId.get(animal.id) ?? null,
    })),
    farms: farms.map((farm) => ({
      id: farm.id,
      name: farm.name,
    })),
    relationAnimals: relationAnimals.map((animal) => ({
      id: animal.id,
      label: animal.visualIdentification
        ? `${animal.internalCode} - ${animal.visualIdentification}`
        : animal.internalCode,
    })),
  };
}

export async function getAnimalDetailData(tenantId: string, animalId: string) {
  const [animal, farms, relationAnimals, photos] = await Promise.all([
    findAnimalById(animalId),
    listFarmsByTenant(tenantId),
    listAnimalsForRelations(tenantId, animalId),
    listFilesByEntity("animal", animalId),
  ]);

  if (!animal || animal.tenantId !== tenantId) {
    return null;
  }

  const sires = await (await import("@/lib/db/prisma")).prisma.animal.findMany({
    where: { tenantId, speciesId: animal.speciesId, sex: "MALE", id: { not: animal.id } },
    select: { id: true, internalCode: true, visualIdentification: true }, orderBy: { internalCode: "asc" },
  });
  const reproductionHistory: ReproductionRecord[] = animal.events.filter(event => isReproductionMetadata(event.metadata)).map(event => ({
    id: event.id, dateIso: event.eventDate.toISOString(), createdAtIso: event.createdAt.toISOString(),
    note: event.description, actorName: event.actor?.name ?? event.actor?.email ?? null,
    details: event.metadata as unknown as ReproductionRecord["details"],
  })).sort((a, b) => b.dateIso.localeCompare(a.dateIso));
  const nextReproductionCheckAt = getNextReproductionCheck(reproductionHistory);
  const timeline = [
    ...animal.events.map((event) => ({
      id: `event-${event.id}`,
      type: "EVENT",
      label: event.eventType,
      title: event.title,
      description: event.description,
      dateIso: toTimelineDate(event.eventDate),
      actorName: event.actor?.name ?? event.actor?.email ?? null,
    })),
    ...animal.weightRecords.map((record) => ({
      id: `weight-${record.id}`,
      type: "WEIGHT",
      label: "Peso",
      title: `${record.weightKg.toString()} kg`,
      description: record.note,
      dateIso: toTimelineDate(record.recordedAt),
      actorName: record.recordedBy?.name ?? record.recordedBy?.email ?? null,
    })),
    ...animal.vaccinationRecords.map((record) => ({
      id: `vaccination-${record.id}`,
      type: "VACCINATION",
      label: "Vacunacion",
      title: record.vaccineName,
      description: record.note,
      dateIso: toTimelineDate(record.appliedAt),
      actorName: record.recordedBy?.name ?? record.recordedBy?.email ?? null,
    })),
    ...animal.treatmentRecords.map((record) => ({
      id: `treatment-${record.id}`,
      type: "TREATMENT",
      label: "Tratamiento",
      title: record.treatmentName,
      description: record.note ?? record.diagnosis,
      dateIso: toTimelineDate(record.appliedAt),
      actorName: record.recordedBy?.name ?? record.recordedBy?.email ?? null,
    })),
  ].sort((left, right) => right.dateIso.localeCompare(left.dateIso));

  return {
    animal: {
      id: animal.id,
      internalCode: animal.internalCode,
      visualIdentification: animal.visualIdentification,
      chipCode: animal.chipCode,
      speciesName: animal.species.name,
      breedName: animal.breed?.name ?? null,
      sex: animal.sex as AnimalSex,
      birthDate: toDateInput(animal.birthDate),
      estimatedAgeMonths: animal.estimatedAgeMonths?.toString() ?? "",
      farmId: animal.farmId,
      farmName: animal.farm.name,
      lotOrZone: animal.lotOrZone,
      productiveLine: animal.productiveLine as AnimalProductiveLine,
      fatherId: animal.fatherId ?? "",
      motherId: animal.motherId ?? "",
      initialWeightKg: decimalToString(animal.initialWeightKg) ?? "",
      currentWeightKg: decimalToString(animal.currentWeightKg) ?? "",
      healthStatus: animal.healthStatus as AnimalHealthStatus,
      reproductiveStatus:
        animal.reproductiveStatus as AnimalReproductiveStatus,
      origin: animal.origin ?? "",
      notes: animal.notes ?? "",
      createdAtIso: animal.createdAt.toISOString(),
      updatedAtIso: animal.updatedAt.toISOString(),
    },
    photos: photos.map((photo) => ({
      id: photo.id,
      name: photo.label ?? photo.originalName,
      url: photo.url,
      mimeType: photo.mimeType,
    })),
    parents: {
      father: animal.father
        ? {
            id: animal.father.id,
            internalCode: animal.father.internalCode,
            visualIdentification: animal.father.visualIdentification,
            speciesName: animal.father.species.name,
            breedName: animal.father.breed?.name ?? null,
            farmName: animal.father.farm.name,
          }
        : null,
      mother: animal.mother
        ? {
            id: animal.mother.id,
            internalCode: animal.mother.internalCode,
            visualIdentification: animal.mother.visualIdentification,
            speciesName: animal.mother.species.name,
            breedName: animal.mother.breed?.name ?? null,
            farmName: animal.mother.farm.name,
          }
        : null,
    },
    weightHistory: animal.weightRecords.map((record) => ({
      id: record.id,
      weightKg: record.weightKg.toString(),
      recordedAtIso: record.recordedAt.toISOString(),
      note: record.note,
      recordedByName: record.recordedBy?.name ?? record.recordedBy?.email ?? null,
    })),
    vaccinationHistory: animal.vaccinationRecords.map((record) => ({
      id: record.id,
      vaccineName: record.vaccineName,
      appliedAtIso: record.appliedAt.toISOString(),
      dose: record.dose,
      batch: record.batch,
      nextDueAtIso: record.nextDueAt?.toISOString() ?? null,
      note: record.note,
      recordedByName: record.recordedBy?.name ?? record.recordedBy?.email ?? null,
    })),
    treatmentHistory: animal.treatmentRecords.map((record) => ({
      id: record.id,
      treatmentName: record.treatmentName,
      appliedAtIso: record.appliedAt.toISOString(),
      diagnosis: record.diagnosis,
      medicine: record.medicine,
      dose: record.dose,
      withdrawalUntilIso: record.withdrawalUntil?.toISOString() ?? null,
      note: record.note,
      recordedByName: record.recordedBy?.name ?? record.recordedBy?.email ?? null,
    })),
    timeline,
    reproductionHistory,
    sireOptions: sires.map(sire => ({ id: sire.id, label: sire.visualIdentification ? sire.internalCode + " - " + sire.visualIdentification : sire.internalCode })),
    nextReproductionCheckAt,
    formOptions: {
      farms: farms.map((farm) => ({
        id: farm.id,
        name: farm.name,
      })),
      relationAnimals: relationAnimals.map((relationAnimal) => ({
        id: relationAnimal.id,
        label: relationAnimal.visualIdentification
          ? `${relationAnimal.internalCode} - ${relationAnimal.visualIdentification}`
          : relationAnimal.internalCode,
      })),
    },
  };
}
