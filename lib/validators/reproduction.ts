import { z } from "zod";
const REPRODUCTION_KINDS = ["SERVICE", "PREGNANCY_CHECK", "CALVING", "FOLLOW_UP"] as const;

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const d = new Date(value + "T00:00:00Z");
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value;
}, "Fecha inválida");
const optionalDate = z.union([date, z.literal("")]).optional();

export const reproductionRecordSchema = z.object({
  animalId: z.string().cuid(),
  kind: z.enum(REPRODUCTION_KINDS),
  eventDate: date,
  method: z.enum(["NATURAL", "INSEMINATION"]).optional(),
  pregnancyResult: z.enum(["POSITIVE", "NEGATIVE", "INCONCLUSIVE"]).optional(),
  sireCode: z.string().trim().max(80).optional(),
  sireId: z.string().cuid().optional(),
  calfCode: z.string().trim().max(80).optional(),
  calfSex: z.enum(["MALE", "FEMALE", "UNKNOWN"]).optional(),
  nextCheckAt: optionalDate,
  expectedCalvingAt: optionalDate,
  note: z.string().trim().max(500).optional(),
}).superRefine((row, ctx) => {
  if (row.kind === "SERVICE" && !row.method)
    ctx.addIssue({ code: "custom", path: ["method"], message: "Indica el método de servicio" });
  if (row.kind === "PREGNANCY_CHECK" && !row.pregnancyResult)
    ctx.addIssue({ code: "custom", path: ["pregnancyResult"], message: "Indica el resultado" });
  if (row.calfCode && row.kind === "CALVING" && !row.calfSex)
    ctx.addIssue({ code: "custom", path: ["calfSex"], message: "Indica el sexo de la cría" });
  if (row.calfSex && !row.calfCode)
    ctx.addIssue({ code: "custom", path: ["calfCode"], message: "Indica el código de la cría" });
  if (row.kind !== "CALVING" && row.calfCode)
    ctx.addIssue({ code: "custom", path: ["calfCode"], message: "La cría se registra al parto" });
  if (row.kind !== "SERVICE" && row.kind !== "CALVING" && row.sireId)
    ctx.addIssue({ code: "custom", path: ["sireId"], message: "El padre solo puede indicarse en servicios o partos" });
  if (row.kind !== "SERVICE" && row.method)
    ctx.addIssue({ code: "custom", path: ["method"], message: "Método solo permitido en servicios" });
  if (row.kind !== "PREGNANCY_CHECK" && row.pregnancyResult)
    ctx.addIssue({ code: "custom", path: ["pregnancyResult"], message: "Resultado solo permitido en diagnósticos" });
  for (const [key, value] of [["nextCheckAt", row.nextCheckAt], ["expectedCalvingAt", row.expectedCalvingAt]] as const) {
    if (value && value < row.eventDate)
      ctx.addIssue({ code: "custom", path: [key], message: "La fecha debe ser igual o posterior al evento" });
  }
});
export type ReproductionRecordInput = z.infer<typeof reproductionRecordSchema>;
