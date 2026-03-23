"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { signIn } from "@/auth";
import { loginSchema } from "@/lib/validators/auth";

export async function authenticateAction(formData: FormData) {
  const provider = formData.get("provider");
  const nextUrl = formData.get("next");
  const redirectTo =
    typeof nextUrl === "string" && nextUrl.startsWith("/") ? nextUrl : "/dashboard";

  if (provider === "google") {
    await signIn("google", {
      redirectTo,
    });

    return;
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect("/login?error=validation");
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=invalid_credentials");
    }

    throw error;
  }
}
