"use server";

import { redirect } from "next/navigation";

import { appEnv } from "@/lib/utils";
import { forgotPasswordSchema } from "@/lib/validators/auth";
import { createPasswordResetToken } from "@/server/services/auth-service";

export async function forgotPasswordAction(formData: FormData) {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    redirect("/forgot-password?error=validation");
  }

  const result = await createPasswordResetToken(parsed.data);

  if (process.env.NODE_ENV !== "production") {
    const resetUrl = new URL("/reset-password", appEnv.appUrl);
    resetUrl.searchParams.set("email", result.email);
    resetUrl.searchParams.set("token", result.token);
    console.info(`AgroLynk password reset URL: ${resetUrl.toString()}`);
  }

  redirect("/forgot-password?success=1");
}
