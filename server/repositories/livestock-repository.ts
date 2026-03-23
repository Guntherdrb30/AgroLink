import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export function findSpeciesByName(tenantId: string, name: string) {
  return prisma.species.findUnique({
    where: {
      tenantId_name: {
        tenantId,
        name,
      },
    },
  });
}

export function createSpecies(data: Prisma.SpeciesUncheckedCreateInput) {
  return prisma.species.create({ data });
}

export function findBreedBySpeciesAndName(
  tenantId: string,
  speciesId: string,
  name: string,
) {
  return prisma.breed.findUnique({
    where: {
      tenantId_speciesId_name: {
        tenantId,
        speciesId,
        name,
      },
    },
  });
}

export function createBreed(data: Prisma.BreedUncheckedCreateInput) {
  return prisma.breed.create({ data });
}

export function listAnimalsByTenant(tenantId: string) {
  return prisma.animal.findMany({
    where: { tenantId },
    include: {
      species: true,
      breed: true,
      farm: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export function listAnimalsForRelations(tenantId: string, excludeAnimalId?: string) {
  return prisma.animal.findMany({
    where: {
      tenantId,
      ...(excludeAnimalId ? { id: { not: excludeAnimalId } } : {}),
    },
    select: {
      id: true,
      internalCode: true,
      visualIdentification: true,
    },
    orderBy: {
      internalCode: "asc",
    },
  });
}

export function findAnimalById(animalId: string) {
  return prisma.animal.findUnique({
    where: { id: animalId },
    include: {
      species: true,
      breed: true,
      farm: true,
      father: {
        include: {
          species: true,
          breed: true,
          farm: true,
        },
      },
      mother: {
        include: {
          species: true,
          breed: true,
          farm: true,
        },
      },
      weightRecords: {
        include: {
          recordedBy: true,
        },
        orderBy: {
          recordedAt: "desc",
        },
      },
      vaccinationRecords: {
        include: {
          recordedBy: true,
        },
        orderBy: {
          appliedAt: "desc",
        },
      },
      treatmentRecords: {
        include: {
          recordedBy: true,
        },
        orderBy: {
          appliedAt: "desc",
        },
      },
      events: {
        include: {
          actor: true,
        },
        orderBy: {
          eventDate: "desc",
        },
      },
    },
  });
}

export function createAnimal(data: Prisma.AnimalUncheckedCreateInput) {
  return prisma.animal.create({
    data,
    include: {
      species: true,
      breed: true,
      farm: true,
    },
  });
}

export function updateAnimal(
  animalId: string,
  data: Prisma.AnimalUpdateInput | Prisma.AnimalUncheckedUpdateInput,
) {
  return prisma.animal.update({
    where: { id: animalId },
    data,
    include: {
      species: true,
      breed: true,
      farm: true,
    },
  });
}

export function deleteAnimal(animalId: string) {
  return prisma.animal.delete({
    where: { id: animalId },
  });
}

export function createAnimalEvent(data: Prisma.AnimalEventUncheckedCreateInput) {
  return prisma.animalEvent.create({ data });
}

export function createAnimalWeightRecord(
  data: Prisma.AnimalWeightRecordUncheckedCreateInput,
) {
  return prisma.animalWeightRecord.create({ data });
}

export function createAnimalVaccinationRecord(
  data: Prisma.AnimalVaccinationRecordUncheckedCreateInput,
) {
  return prisma.animalVaccinationRecord.create({ data });
}

export function createAnimalTreatmentRecord(
  data: Prisma.AnimalTreatmentRecordUncheckedCreateInput,
) {
  return prisma.animalTreatmentRecord.create({ data });
}
