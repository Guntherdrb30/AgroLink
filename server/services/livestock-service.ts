import type { AnimalInput, AnimalEventInput, AnimalTreatmentInput, AnimalVaccinationInput, AnimalWeightInput } from "@/lib/validators/livestock";
import { removeStoredFile, storeFile } from "@/server/services/file-storage-service";
import {
  createAnimal,
  createAnimalEvent,
  createAnimalTreatmentRecord,
  createAnimalVaccinationRecord,
  createAnimalWeightRecord,
  createBreed,
  createSpecies,
  deleteAnimal,
  findAnimalById,
  findBreedBySpeciesAndName,
  findSpeciesByName,
  updateAnimal,
} from "@/server/repositories/livestock-repository";
import { listFilesByEntity } from "@/server/repositories/file-storage-repository";

function normalizeDecimal(value?: string) {
  if (!value?.trim()) {
    return null;
  }

  return value.replace(",", ".");
}

function normalizeDate(value?: string) {
  if (!value?.trim()) {
    return null;
  }

  return new Date(value);
}

async function ensureSpeciesAndBreed(params: {
  tenantId: string;
  speciesName: string;
  breedName?: string;
}) {
  const normalizedSpecies = params.speciesName.trim();
  let species = await findSpeciesByName(params.tenantId, normalizedSpecies);

  if (!species) {
    species = await createSpecies({
      tenantId: params.tenantId,
      name: normalizedSpecies,
    });
  }

  if (!params.breedName?.trim()) {
    return { species, breed: null };
  }

  const normalizedBreed = params.breedName.trim();
  let breed = await findBreedBySpeciesAndName(
    params.tenantId,
    species.id,
    normalizedBreed,
  );

  if (!breed) {
    breed = await createBreed({
      tenantId: params.tenantId,
      speciesId: species.id,
      name: normalizedBreed,
    });
  }

  return { species, breed };
}

export async function createAnimalForTenant(
  tenantId: string,
  actorUserId: string,
  input: AnimalInput,
  photos: File[],
) {
  const { species, breed } = await ensureSpeciesAndBreed({
    tenantId,
    speciesName: input.speciesName,
    breedName: input.breedName,
  });

  const animal = await createAnimal({
    tenantId,
    speciesId: species.id,
    breedId: breed?.id ?? null,
    farmId: input.farmId,
    fatherId: input.fatherId || null,
    motherId: input.motherId || null,
    internalCode: input.internalCode,
    visualIdentification: input.visualIdentification?.trim() || null,
    chipCode: input.chipCode?.trim() || null,
    sex: input.sex,
    birthDate: normalizeDate(input.birthDate),
    estimatedAgeMonths: input.estimatedAgeMonths
      ? Number.parseInt(input.estimatedAgeMonths, 10)
      : null,
    lotOrZone: input.lotOrZone?.trim() || null,
    productiveLine: input.productiveLine,
    initialWeightKg: normalizeDecimal(input.initialWeightKg),
    currentWeightKg:
      normalizeDecimal(input.currentWeightKg) ?? normalizeDecimal(input.initialWeightKg),
    healthStatus: input.healthStatus,
    reproductiveStatus: input.reproductiveStatus,
    origin: input.origin?.trim() || null,
    notes: input.notes?.trim() || null,
  });

  await createAnimalEvent({
    tenantId,
    animalId: animal.id,
    actorUserId,
    eventType: "ENTRY",
    title: "Animal record created",
    description: "Master file created in AgroLynk.",
    eventDate: new Date(),
  });

  if (input.initialWeightKg?.trim()) {
    await createAnimalWeightRecord({
      tenantId,
      animalId: animal.id,
      recordedById: actorUserId,
      weightKg: normalizeDecimal(input.initialWeightKg)!,
      recordedAt: new Date(),
      note: "Initial weight registered during onboarding.",
    });
  }

  for (const photo of photos) {
    await storeFile({
      tenantId,
      uploadedById: actorUserId,
      file: photo,
      usage: "livestock_image",
      entityType: "animal",
      entityId: animal.id,
      label: "Animal photo",
      metadata: {
        internalCode: animal.internalCode,
      },
    });
  }

  return animal;
}

export async function updateAnimalForTenant(
  tenantId: string,
  actorUserId: string,
  animalId: string,
  input: AnimalInput,
  photos: File[],
) {
  const existingAnimal = await findAnimalById(animalId);

  if (!existingAnimal || existingAnimal.tenantId !== tenantId) {
    throw new Error("ANIMAL_NOT_FOUND");
  }

  const { species, breed } = await ensureSpeciesAndBreed({
    tenantId,
    speciesName: input.speciesName,
    breedName: input.breedName,
  });

  const animal = await updateAnimal(animalId, {
    speciesId: species.id,
    breedId: breed?.id ?? null,
    farmId: input.farmId,
    fatherId: input.fatherId || null,
    motherId: input.motherId || null,
    internalCode: input.internalCode,
    visualIdentification: input.visualIdentification?.trim() || null,
    chipCode: input.chipCode?.trim() || null,
    sex: input.sex,
    birthDate: normalizeDate(input.birthDate),
    estimatedAgeMonths: input.estimatedAgeMonths
      ? Number.parseInt(input.estimatedAgeMonths, 10)
      : null,
    lotOrZone: input.lotOrZone?.trim() || null,
    productiveLine: input.productiveLine,
    initialWeightKg: normalizeDecimal(input.initialWeightKg),
    currentWeightKg: normalizeDecimal(input.currentWeightKg),
    healthStatus: input.healthStatus,
    reproductiveStatus: input.reproductiveStatus,
    origin: input.origin?.trim() || null,
    notes: input.notes?.trim() || null,
  });

  await createAnimalEvent({
    tenantId,
    animalId,
    actorUserId,
    eventType: "NOTE",
    title: "Animal record updated",
    description: "Core fields updated from livestock module.",
    eventDate: new Date(),
  });

  for (const photo of photos) {
    await storeFile({
      tenantId,
      uploadedById: actorUserId,
      file: photo,
      usage: "livestock_image",
      entityType: "animal",
      entityId: animal.id,
      label: "Animal photo",
      metadata: {
        internalCode: animal.internalCode,
      },
    });
  }

  return animal;
}

export async function deleteAnimalForTenant(tenantId: string, animalId: string) {
  const animal = await findAnimalById(animalId);

  if (!animal || animal.tenantId !== tenantId) {
    throw new Error("ANIMAL_NOT_FOUND");
  }

  const files = await listFilesByEntity("animal", animalId);

  for (const file of files) {
    await removeStoredFile(file.id);
  }

  await deleteAnimal(animalId);
}

export async function addAnimalEventForTenant(
  tenantId: string,
  actorUserId: string,
  input: AnimalEventInput,
) {
  const animal = await findAnimalById(input.animalId);

  if (!animal || animal.tenantId !== tenantId) {
    throw new Error("ANIMAL_NOT_FOUND");
  }

  return createAnimalEvent({
    tenantId,
    animalId: input.animalId,
    actorUserId,
    eventType: input.eventType,
    title: input.title,
    description: input.description?.trim() || null,
    eventDate: new Date(input.eventDate),
  });
}

export async function addAnimalWeightRecordForTenant(
  tenantId: string,
  actorUserId: string,
  input: AnimalWeightInput,
) {
  const animal = await findAnimalById(input.animalId);

  if (!animal || animal.tenantId !== tenantId) {
    throw new Error("ANIMAL_NOT_FOUND");
  }

  const weightRecord = await createAnimalWeightRecord({
    tenantId,
    animalId: input.animalId,
    recordedById: actorUserId,
    weightKg: normalizeDecimal(input.weightKg)!,
    recordedAt: new Date(input.recordedAt),
    note: input.note?.trim() || null,
  });

  await updateAnimal(input.animalId, {
    currentWeightKg: normalizeDecimal(input.weightKg)!,
  });

  await createAnimalEvent({
    tenantId,
    animalId: input.animalId,
    actorUserId,
    eventType: "WEIGHING",
    title: "Weight recorded",
    description: input.note?.trim() || null,
    eventDate: new Date(input.recordedAt),
  });

  return weightRecord;
}

export async function addAnimalVaccinationForTenant(
  tenantId: string,
  actorUserId: string,
  input: AnimalVaccinationInput,
) {
  const animal = await findAnimalById(input.animalId);

  if (!animal || animal.tenantId !== tenantId) {
    throw new Error("ANIMAL_NOT_FOUND");
  }

  const vaccination = await createAnimalVaccinationRecord({
    tenantId,
    animalId: input.animalId,
    recordedById: actorUserId,
    vaccineName: input.vaccineName,
    appliedAt: new Date(input.appliedAt),
    dose: input.dose?.trim() || null,
    batch: input.batch?.trim() || null,
    nextDueAt: input.nextDueAt ? new Date(input.nextDueAt) : null,
    note: input.note?.trim() || null,
  });

  await createAnimalEvent({
    tenantId,
    animalId: input.animalId,
    actorUserId,
    eventType: "VACCINATION",
    title: input.vaccineName,
    description: input.note?.trim() || null,
    eventDate: new Date(input.appliedAt),
  });

  return vaccination;
}

export async function addAnimalTreatmentForTenant(
  tenantId: string,
  actorUserId: string,
  input: AnimalTreatmentInput,
) {
  const animal = await findAnimalById(input.animalId);

  if (!animal || animal.tenantId !== tenantId) {
    throw new Error("ANIMAL_NOT_FOUND");
  }

  const treatment = await createAnimalTreatmentRecord({
    tenantId,
    animalId: input.animalId,
    recordedById: actorUserId,
    treatmentName: input.treatmentName,
    appliedAt: new Date(input.appliedAt),
    diagnosis: input.diagnosis?.trim() || null,
    medicine: input.medicine?.trim() || null,
    dose: input.dose?.trim() || null,
    withdrawalUntil: input.withdrawalUntil
      ? new Date(input.withdrawalUntil)
      : null,
    note: input.note?.trim() || null,
  });

  await createAnimalEvent({
    tenantId,
    animalId: input.animalId,
    actorUserId,
    eventType: "TREATMENT",
    title: input.treatmentName,
    description: input.note?.trim() || null,
    eventDate: new Date(input.appliedAt),
  });

  return treatment;
}
