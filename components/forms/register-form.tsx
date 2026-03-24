import Link from "next/link";

import { registerAction } from "@/server/actions/register";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type RegisterFormProps = {
  errorMessage?: string;
};

export function RegisterForm({ errorMessage }: RegisterFormProps) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          Registro
        </p>
        <CardTitle className="text-3xl">Crea tu cuenta empresarial</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={registerAction} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="name">
              Nombre completo
            </label>
            <Input id="name" name="name" placeholder="Gunther Del Rosario" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="tenantName">
              Nombre de la empresa o finca
            </label>
            <Input
              id="tenantName"
              name="tenantName"
              placeholder="Finca AgroLynk Demo"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="email">
              Email
            </label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="password">
              Contrasena
            </label>
            <Input id="password" name="password" type="password" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="confirmPassword">
              Confirmar contrasena
            </label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
            />
          </div>
          {errorMessage ? (
            <p className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {errorMessage}
            </p>
          ) : null}
          <Button className="w-full" type="submit">
            Crear cuenta
          </Button>
        </form>
        <p className="mt-5 text-sm text-muted-foreground">
          El acceso con Google solo estara disponible cuando este correo ya tenga una cuenta registrada en AgroLynk.
        </p>
        <Link href="/login" className="mt-4 inline-block text-sm font-medium text-primary">
          Volver al acceso
        </Link>
      </CardContent>
    </Card>
  );
}
