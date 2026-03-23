import { LoginForm } from "@/components/forms/login-form";

const errorMessages: Record<string, string> = {
  invalid_credentials: "Invalid email or password.",
  validation: "Complete the required fields correctly.",
  google_account_not_linked:
    "Google access is available only after a matching AgroLynk account already exists.",
  google_email_missing: "Google did not provide a usable email address.",
};

const successMessages: Record<string, string> = {
  password_reset: "Password updated. You can sign in now.",
};

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const errorParam = params?.error;
  const successParam = params?.success;
  const nextParam = params?.next;
  const error = Array.isArray(errorParam) ? errorParam[0] : errorParam;
  const success = Array.isArray(successParam) ? successParam[0] : successParam;
  const next = Array.isArray(nextParam) ? nextParam[0] : nextParam;

  return (
    <LoginForm
      errorMessage={error ? errorMessages[error] : undefined}
      successMessage={success ? successMessages[success] : undefined}
      next={next}
    />
  );
}
