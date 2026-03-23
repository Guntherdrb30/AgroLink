import { z } from "zod";

export const tenantSchema = z.object({
  name: z.string().min(3).max(120),
  slug: z
    .string()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9-]+$/),
});

export type TenantInput = z.infer<typeof tenantSchema>;
