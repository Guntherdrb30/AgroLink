import { ForgotPasswordForm } from "@/components/forms/forgot-password-form";

const errorMessages: Record<string, string> = {
  validation: "Enter a valid email address.",
};

const successMessages: Record<string, string> = {
  "1": "If the email exists, the reset flow is now prepared.",
};

type ForgotPasswordPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const params = await searchParams;
  const errorParam = params?.error;
  const successParam = params?.success;
  const error = Array.isArray(errorParam) ? errorParam[0] : errorParam;
  const success = Array.isArray(successParam) ? successParam[0] : successParam;

  return (
    <ForgotPasswordForm
      errorMessage={error ? errorMessages[error] : undefined}
      successMessage={success ? successMessages[success] : undefined}
    />
  );
}
