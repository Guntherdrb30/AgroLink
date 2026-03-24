import { ForgotPasswordForm } from "@/components/forms/forgot-password-form";

const errorMessages: Record<string, string> = {
  validation: "Ingresa una direccion de correo valida.",
};

const successMessages: Record<string, string> = {
  "1": "Si el correo existe, el flujo de recuperacion ya fue preparado.",
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
