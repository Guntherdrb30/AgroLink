"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { signIn } from "@/auth";
import { registerSchema } from "@/lib/validators/auth";
import { registerWithCredentials } from "@/server/services/auth-service";

export async function registerAction(formData: FormData) {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    tenantName: formData.get("tenantName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    redirect("/register?error=validation");
  }

  try {
    await registerWithCredentials(parsed.data);
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=invalid_credentials");
    }

    if (error instanceof Error && error.message === "EMAIL_ALREADY_EXISTS") {
      redirect("/register?error=email_exists");
    }

    throw error;
  }
}
