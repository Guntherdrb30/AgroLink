import { SignUp } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { isUnsafePreviewDatabase } from "@/lib/security/preview-db-isolation";

export default function RegisterPage() {
  if (isUnsafePreviewDatabase()) redirect("/preview-configuracion");
  return <SignUp routing="hash" fallbackRedirectUrl="/onboarding" signInUrl="/login" />;
}
