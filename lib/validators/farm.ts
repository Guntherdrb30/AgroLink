import { z } from "zod";

const decimalPattern = /^-?\d+([.,]\d+)?$/;

function optionalDecimalString(field: string) {
  return z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || decimalPattern.test(value), {
      message: `${field} must be a valid decimal value`,
    });
}

export const farmSchema = z.object({
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().max(500).optional(),
  location: z.string().trim().max(160).optional(),
  latitude: optionalDecimalString("Latitude"),
  longitude: optionalDecimalString("Longitude"),
  hectares: optionalDecimalString("Hectares"),
});

export const farmIdSchema = z.object({
  farmId: z.string().cuid(),
});

export type FarmInput = z.infer<typeof farmSchema>;
