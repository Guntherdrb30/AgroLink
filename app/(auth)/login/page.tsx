import { LoginForm } from "@/components/forms/login-form";

const errorMessages: Record<string, string> = {
  invalid_credentials: "Correo o contrasena incorrectos.",
  validation: "Completa correctamente los campos requeridos.",
  google_account_not_linked:
    "El acceso con Google solo esta disponible cuando ya existe una cuenta AgroLynk con ese correo.",
  google_email_missing: "Google no envio una direccion de correo valida.",
};

const successMessages: Record<string, string> = {
  password_reset: "Contrasena actualizada. Ya puedes ingresar.",
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
