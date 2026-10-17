import { notFound } from "next/navigation";
import { sendWelcomeEmailAction } from "@/server/actions/notification-actions";
import { notificationsConfigured } from "@/server/services/notification-email-service";
import { Button } from "@/components/ui/button";

import { findTenantVerificationProfile, listVerificationProfilesByTenant } from "@/server/repositories/verification-repository";
import { requireRole } from "@/lib/auth/session";
import { TenantVerificationForm } from "@/components/forms/tenant-verification-form";
import { VerificationBadge } from "@/components/shared/verification-badge";
import { DocumentList } from "@/components/verification/document-list";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function VerificationPage() {
  const { tenantContext } = await requireRole({
    tenant: ["TENANT_OWNER", "TENANT_ADMIN", "FARM_MANAGER", "OPERATOR"],
  });

  if (!tenantContext) {
    notFound();
  }

  const [tenantProfile, profiles] = await Promise.all([
    findTenantVerificationProfile(tenantContext.tenant.id),
    listVerificationProfilesByTenant(tenantContext.tenant.id),
  ]);

  if (!tenantProfile) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Verificacion"
        title="Centro de verificacion de la empresa"
        description="Carga documentos, envia expedientes y monitorea el estado de aprobacion antes de habilitar operacion completa."
      />
      <Card>
        <CardHeader>
          <CardTitle>Notificaciones por correo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Clerk gestiona los codigos de acceso. AgroLynk enviara avisos sobre tu empresa y sus verificaciones.
          </p>
          {notificationsConfigured() ? (
            <form action={sendWelcomeEmailAction}>
              <Button type="submit" variant="outline">Enviar correo de bienvenida</Button>
            </form>
          ) : (
            <p className="text-sm font-medium text-amber-800">
              El servicio de notificaciones esta pendiente de activar por el administrador.
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle>Estado general de la cuenta</CardTitle>
          <VerificationBadge status={tenantProfile.status} />
        </CardHeader>
        <CardContent>
          <TenantVerificationForm
            profile={{
              id: tenantProfile.id,
              status: tenantProfile.status,
              notes: tenantProfile.notes,
            }}
          />
        </CardContent>
      </Card>
      <DocumentList
        title="Documentos de cuenta"
        documents={tenantProfile.documents.map((document) => ({
          id: document.id,
          label: document.label,
          type: document.type,
          fileName: document.fileName,
          blobUrl: document.blobUrl,
          mimeType: document.file?.mimeType ?? document.contentType,
        }))}
      />
      <Card>
        <CardHeader>
          <CardTitle>Perfiles vinculados</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {profiles.map((profile) => (
            <div key={profile.id} className="rounded-2xl bg-muted p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">
                  {profile.subjectType === "TENANT"
                    ? "Cuenta de la empresa"
                    : profile.farm?.name || "Finca"}
                </p>
                <VerificationBadge status={profile.status} />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {profile.documents.length} documentos cargados
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
