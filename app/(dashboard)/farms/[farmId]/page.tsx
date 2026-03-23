import { notFound } from "next/navigation";

import { deleteFarmAction } from "@/server/actions/farm-actions";
import { findFarmById } from "@/server/repositories/farm-repository";
import { requireRole } from "@/lib/auth/session";
import { FarmForm } from "@/components/forms/farm-form";
import { FarmVerificationForm } from "@/components/forms/farm-verification-form";
import { VerificationBadge } from "@/components/shared/verification-badge";
import { DocumentList } from "@/components/verification/document-list";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type FarmDetailPageProps = {
  params: Promise<{
    farmId: string;
  }>;
};

export default async function FarmDetailPage({ params }: FarmDetailPageProps) {
  const { farmId } = await params;
  const { tenantContext } = await requireRole({
    tenant: ["TENANT_OWNER", "TENANT_ADMIN", "FARM_MANAGER", "OPERATOR"],
  });

  const farm = await findFarmById(farmId);

  if (!tenantContext || !farm || farm.tenantId !== tenantContext.tenant.id) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Detalle de finca"
        title={farm.name}
        description="Actualiza datos, administra activos y completa el expediente documental de verificacion."
      />
      <div className="flex items-center gap-3">
        <VerificationBadge
          status={farm.verificationProfile?.status ?? "PENDING"}
        />
        <span className="text-sm text-muted-foreground">{farm.location || "Ubicacion pendiente"}</span>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Editar finca</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FarmForm
            mode="edit"
            farm={{
              id: farm.id,
              name: farm.name,
              description: farm.description,
              location: farm.location,
              latitude: farm.latitude?.toString() ?? null,
              longitude: farm.longitude?.toString() ?? null,
              hectares: farm.hectares?.toString() ?? null,
              primaryImageUrl: farm.primaryImageUrl,
              logoUrl: farm.logoUrl,
            }}
          />
          <form action={deleteFarmAction}>
            <input type="hidden" name="farmId" value={farm.id} />
            <Button type="submit" variant="outline">
              Eliminar finca
            </Button>
          </form>
        </CardContent>
      </Card>
      {farm.verificationProfile ? (
        <Card>
          <CardHeader>
            <CardTitle>Verificacion documental</CardTitle>
          </CardHeader>
          <CardContent>
            <FarmVerificationForm
              farmId={farm.id}
              profile={{
                id: farm.verificationProfile.id,
                status: farm.verificationProfile.status,
                notes: farm.verificationProfile.notes,
              }}
            />
          </CardContent>
        </Card>
      ) : null}
      <DocumentList
        title="Documentos cargados"
        documents={(farm.verificationProfile?.documents ?? []).map((document) => ({
          id: document.id,
          label: document.label,
          type: document.type,
          fileName: document.fileName,
          blobUrl: document.blobUrl,
          mimeType: document.file?.mimeType ?? document.contentType,
        }))}
      />
    </div>
  );
}
