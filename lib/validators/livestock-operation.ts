import { z } from "zod";

const decimalPattern = /^-?\d+([.,]\d+)?$/;

const optionalDecimal = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || decimalPattern.test(value), {
    message: "Must be a valid decimal number",
  });

export const livestockOperationSchema = z.object({
  title: z.string().trim().min(3).max(120),
  farmId: z.string().cuid(),
  operationDate: z.string().trim().min(10),
  plannedTypes: z
    .array(
      z.enum([
        "WEIGHING",
        "VACCINATION",
        "DEWORMING",
        "COUNT",
        "HEALTH_REVIEW",
        "CLASSIFICATION",
        "TREATMENT",
      ]),
    )
    .min(1),
  notes: z.string().trim().max(500).optional(),
  includeAllFarmAnimals: z.boolean().default(false),
  animalIds: z.array(z.string().cuid()).default([]),
});

export const operationExpenseSchema = z.object({
  operationId: z.string().cuid(),
  label: z.string().trim().min(2).max(120),
  amount: z.string().trim().refine((value) => decimalPattern.test(value), {
    message: "Amount must be decimal",
  }),
  notes: z.string().trim().max(250).optional(),
});

export const operationWorkerSchema = z.object({
  operationId: z.string().cuid(),
  employeeId: z.string().trim().optional(),
  fullName: z.string().trim().min(2).max(120),
  role: z.enum([
    "SUPERVISOR",
    "OPERATOR",
    "VETERINARY",
    "RECORDER",
    "DRIVER",
    "OTHER",
  ]),
  notes: z.string().trim().max(250).optional(),
});

export const operationAnimalResultSchema = z.object({
  operationAnimalId: z.string().cuid(),
  weightKg: optionalDecimal,
  vaccineName: z.string().trim().max(120).optional(),
  dewormingName: z.string().trim().max(120).optional(),
  treatmentName: z.string().trim().max(120).optional(),
  observations: z.string().trim().max(400).optional(),
  generalStatus: z.enum([
    "NOT_CHECKED",
    "GOOD",
    "UNDER_OBSERVATION",
    "SICK",
    "CRITICAL",
  ]),
  skipped: z.boolean().default(false),
});

export const operationLookupSchema = z.object({
  code: z.string().trim().min(1).max(120),
});

export type LivestockOperationInput = z.infer<typeof livestockOperationSchema>;
export type OperationExpenseInput = z.infer<typeof operationExpenseSchema>;
export type OperationWorkerInput = z.infer<typeof operationWorkerSchema>;
export type OperationAnimalResultInput = z.infer<
  typeof operationAnimalResultSchema
>;
