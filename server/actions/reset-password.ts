"use server";

import { redirect } from "next/navigation";

import { resetPasswordSchema } from "@/lib/validators/auth";
import { resetPassword } from "@/server/services/auth-service";

export async function resetPasswordAction(formData: FormData) {
  const parsed = resetPasswordSchema.safeParse({
    email: formData.get("email"),
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    const email = String(formData.get("email") ?? "");
    const token = String(formData.get("token") ?? "");
    redirect(
      `/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}&error=validation`,
    );
  }

  try {
    await resetPassword(parsed.data);
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_RESET_TOKEN") {
      redirect("/reset-password?error=invalid_token");
    }

    throw error;
  }

  redirect("/login?success=password_reset");
}
