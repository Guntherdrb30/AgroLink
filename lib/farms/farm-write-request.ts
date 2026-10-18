import { z } from "zod";

import { farmSchema } from "@/lib/validators/farm";

// Files are uploaded separately to a tenant-scoped PRIVATE blob. Only short
// storage path references are accepted in these JSON write requests.
const uploadPath = z.string().min(1).max(350).nullable().optional();

export const farmWriteRequestSchema = z.object({
  farm: farmSchema,
  assets: z.object({
    primaryImagePath: uploadPath,
    logoPath: uploadPath,
  }).optional(),
});

export function isSameOriginFarmRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  return (!origin || origin === new URL(request.url).origin) &&
    (!fetchSite || fetchSite === "same-origin" || fetchSite === "none");
}

export const farmNoStoreHeaders = { "Cache-Control": "private, no-store" };
