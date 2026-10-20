import { SignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { isUnsafePreviewDatabase } from "@/lib/security/preview-db-isolation";

export default function LoginPage() {
  if (isUnsafePreviewDatabase()) redirect("/preview-configuracion");
  return <SignIn routing="hash" fallbackRedirectUrl="/dashboard" signUpUrl="/register" />;
}
