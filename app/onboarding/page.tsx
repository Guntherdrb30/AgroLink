import { isBusinessVerificationRequired } from "@/lib/config/business-verification";
import { redirect } from "next/navigation";
import { getCurrentTenant, requireAuth } from "@/lib/auth/session";
import { createFirstTenantAction } from "@/server/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  await requireAuth();
  if (await getCurrentTenant()) redirect("/dashboard");
  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-6">
      <Card className="w-full">
        <CardHeader>
          <p className="text-sm uppercase tracking-widest text-muted-foreground">GanadIA</p>
          <CardTitle className="text-3xl">Registra tu empresa o finca</CardTitle>
          <p className="text-sm text-muted-foreground">
            Tu identidad ya fue verificada. Ahora crea la empresa que administraras en GanadIA.
            {isBusinessVerificationRequired() ? "Los documentos se revisaran antes de habilitar las operaciones." : "Modo de desarrollo: puedes probar las funcionalidades sin completar la verificación documental. Clerk y los permisos siguen activos."}
          </p>
        </CardHeader>
        <CardContent>
          <form action={createFirstTenantAction} className="space-y-4">
            <label htmlFor="tenantName" className="block text-sm font-medium">Nombre de la empresa o finca</label>
            <Input id="tenantName" name="tenantName" minLength={3} maxLength={120} required />
            <Button type="submit" className="w-full">Crear empresa y continuar</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
