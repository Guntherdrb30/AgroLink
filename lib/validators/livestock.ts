import { z } from "zod";

const decimalPattern = /^-?\d+([.,]\d+)?$/;

const optionalDecimal = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || decimalPattern.test(value), {
    message: "Must be a valid decimal number",
  });

const optionalDate = z.string().trim().optional();

export const animalSchema = z
  .object({
    internalCode: z.string().trim().min(2).max(60),
    visualIdentification: z.string().trim().max(120).optional(),
    chipCode: z.string().trim().max(80).optional(),
    speciesName: z.string().trim().min(2).max(80),
    breedName: z.string().trim().max(80).optional(),
    sex: z.enum(["FEMALE", "MALE", "UNKNOWN"]),
    birthDate: optionalDate,
    estimatedAgeMonths: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || /^\d+$/.test(value), {
        message: "Estimated age must be numeric",
      }),
    farmId: z.string().cuid(),
    lotOrZone: z.string().trim().max(120).optional(),
    productiveLine: z.enum([
      "BEEF",
      "DAIRY",
      "DUAL_PURPOSE",
      "BREEDING",
      "WORK",
      "OTHER",
    ]),
    fatherId: z.string().trim().optional(),
    motherId: z.string().trim().optional(),
    initialWeightKg: optionalDecimal,
    currentWeightKg: optionalDecimal,
    healthStatus: z.enum([
      "HEALTHY",
      "UNDER_OBSERVATION",
      "SICK",
      "RECOVERING",
      "QUARANTINE",
    ]),
    reproductiveStatus: z.enum([
      "OPEN",
      "PREGNANT",
      "LACTATING",
      "BREEDING_MALE",
      "CASTRATED",
      "YOUNG",
      "UNKNOWN",
    ]),
    origin: z.string().trim().max(160).optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .refine((data) => data.birthDate || data.estimatedAgeMonths, {
    message: "Birth date or estimated age is required",
    path: ["birthDate"],
  });

export const animalEventSchema = z.object({
  animalId: z.string().cuid(),
  eventType: z.enum([
    "BIRTH",
    "ENTRY",
    "TRANSFER",
    "WEIGHING",
    "VACCINATION",
    "TREATMENT",
    "REPRODUCTION",
    "SALE",
    "DEATH",
    "NOTE",
    "OTHER",
  ]),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  eventDate: z.string().trim().min(10),
});

export const animalWeightSchema = z.object({
  animalId: z.string().cuid(),
  weightKg: z.string().trim().refine((value) => decimalPattern.test(value), {
    message: "Weight must be decimal",
  }),
  recordedAt: z.string().trim().min(10),
  note: z.string().trim().max(250).optional(),
});

export const animalVaccinationSchema = z.object({
  animalId: z.string().cuid(),
  vaccineName: z.string().trim().min(2).max(120),
  appliedAt: z.string().trim().min(10),
  dose: z.string().trim().max(80).optional(),
  batch: z.string().trim().max(80).optional(),
  nextDueAt: optionalDate,
  note: z.string().trim().max(250).optional(),
});

export const animalTreatmentSchema = z.object({
  animalId: z.string().cuid(),
  treatmentName: z.string().trim().min(2).max(120),
  appliedAt: z.string().trim().min(10),
  diagnosis: z.string().trim().max(160).optional(),
  medicine: z.string().trim().max(160).optional(),
  dose: z.string().trim().max(80).optional(),
  withdrawalUntil: optionalDate,
  note: z.string().trim().max(250).optional(),
});

export type AnimalInput = z.infer<typeof animalSchema>;
export type AnimalEventInput = z.infer<typeof animalEventSchema>;
export type AnimalWeightInput = z.infer<typeof animalWeightSchema>;
export type AnimalVaccinationInput = z.infer<typeof animalVaccinationSchema>;
export type AnimalTreatmentInput = z.infer<typeof animalTreatmentSchema>;
