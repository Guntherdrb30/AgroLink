import Link from "next/link";

import { forgotPasswordAction } from "@/server/actions/forgot-password";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ForgotPasswordFormProps = {
  errorMessage?: string;
  successMessage?: string;
};

export function ForgotPasswordForm({
  errorMessage,
  successMessage,
}: ForgotPasswordFormProps) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          Recuperacion
        </p>
        <CardTitle className="text-3xl">Preparar cambio de contrasena</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={forgotPasswordAction} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="email">
              Email
            </label>
            <Input id="email" name="email" type="email" required />
          </div>
          {errorMessage ? (
            <p className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {errorMessage}
            </p>
          ) : null}
          {successMessage ? (
            <p className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
              {successMessage}
            </p>
          ) : null}
          <Button className="w-full" type="submit">
            Generar enlace de cambio
          </Button>
        </form>
        <p className="mt-5 text-sm text-muted-foreground">
          En esta etapa el enlace de recuperacion se imprime en la terminal. El envio por correo puede conectarse despues.
        </p>
        <Link href="/login" className="mt-4 inline-block text-sm font-medium text-primary">
          Volver al acceso
        </Link>
      </CardContent>
    </Card>
  );
}
