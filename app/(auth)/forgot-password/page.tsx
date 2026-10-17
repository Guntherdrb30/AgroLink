import { redirect } from "next/navigation";

// Clerk handles password recovery inside the sign-in experience.
export default function ForgotPasswordPage() {
  redirect("/login");
}
