import { ResetPasswordForm } from "@/components/forms/reset-password-form";

const errorMessages: Record<string, string> = {
  validation: "Ingresa una nueva contrasena valida.",
  invalid_token: "El token de recuperacion no es valido o ya vencio.",
};

type ResetPasswordPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams;
  const errorParam = params?.error;
  const emailParam = params?.email;
  const tokenParam = params?.token;
  const error = Array.isArray(errorParam) ? errorParam[0] : errorParam;
  const email = Array.isArray(emailParam) ? emailParam[0] : emailParam;
  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;

  return (
    <ResetPasswordForm
      email={email}
      token={token}
      errorMessage={error ? errorMessages[error] : undefined}
    />
  );
}
