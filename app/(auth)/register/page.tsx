import { RegisterForm } from "@/components/forms/register-form";

const errorMessages: Record<string, string> = {
  validation: "Review the required fields and try again.",
  email_exists: "That email already has an AgroLynk account.",
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
