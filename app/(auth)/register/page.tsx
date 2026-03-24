import { RegisterForm } from "@/components/forms/register-form";

const errorMessages: Record<string, string> = {
  validation: "Revisa los campos requeridos e intenta nuevamente.",
  email_exists: "Ese correo ya tiene una cuenta en AgroLynk.",
};

type RegisterPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const errorParam = params?.error;
  const error = Array.isArray(errorParam) ? errorParam[0] : errorParam;

  return <RegisterForm errorMessage={error ? errorMessages[error] : undefined} />;
}
