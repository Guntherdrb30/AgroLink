import { z } from "zod";

export const uploadUsageSchema = z.enum([
  "verification_document",
  "livestock_image",
  "listing_image",
  "import_file",
  "manual_file",
  "report_file",
  "farm_primary_image",
  "farm_logo",
  "operation_sheet",
]);

export const fileUploadRequestSchema = z.object({
  usage: uploadUsageSchema,
  label: z.string().trim().max(160).optional(),
  entityType: z.string().trim().max(80).optional(),
  entityId: z.string().trim().max(120).optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
});

export type FileUploadRequestInput = z.infer<typeof fileUploadRequestSchema>;
