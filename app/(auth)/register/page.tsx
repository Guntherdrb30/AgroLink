import { SignUp } from "@clerk/nextjs";

export default function RegisterPage() {
  return <SignUp routing="hash" fallbackRedirectUrl="/onboarding" signInUrl="/login" />;
}
