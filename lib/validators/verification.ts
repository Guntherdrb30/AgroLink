import { z } from "zod";

export const verificationReviewSchema = z.object({
  profileId: z.string().cuid(),
  action: z.enum(["approve", "request_fix", "reject", "start_review"]),
  comment: z.string().trim().max(500).optional(),
});

export const submitVerificationSchema = z.object({
  profileId: z.string().cuid(),
});
