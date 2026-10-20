import { notFound } from "next/navigation";
import { isBusinessVerificationRequired } from "@/lib/config/business-verification";

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
  searchParams: Promise<{ gpsLat?: string; gpsLon?: string }>;
};

export default async function FarmDetailPage({ params, searchParams }: FarmDetailPageProps) {
  const { farmId } = await params;
  const { gpsLat, gpsLon } = await searchParams;
  const candidateLat = gpsLat === undefined || gpsLat.trim() === "" ? null : Number(gpsLat);
  const candidateLon = gpsLon === undefined || gpsLon.trim() === "" ? null : Number(gpsLon);
  const gpsSuggestion = candidateLat !== null && candidateLon !== null && Number.isFinite(candidateLat) &&
    Number.isFinite(candidateLon) && candidateLat >= -90 && candidateLat <= 90 &&
    candidateLon >= -180 && candidateLon <= 180;
  const { tenantContext } = await requireRole({
    tenant: ["TENANT_OWNER", "TENANT_ADMIN", "FARM_MANAGER", "OPERATOR"],
  });

  const farm = await findFarmById(farmId);

  if (!tenantContext || !farm || farm.tenantId !== tenantContext.tenant.id) {
    notFound();
  }

  const verificationRequired = isBusinessVerificationRequired();
  const canEdit = ["TENANT_OWNER", "TENANT_ADMIN", "FARM_MANAGER"].includes(tenantContext.membership.role);
  const canDelete = ["TENANT_OWNER", "TENANT_ADMIN"].includes(tenantContext.membership.role);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Detalle de finca"
        title={farm.name}
        description={verificationRequired
          ? "Actualiza datos, administra activos y completa el expediente documental de verificacion."
          : "Actualiza los datos y activos de tu finca. La verificacion documental esta pospuesta durante las pruebas."}
      />
      <div className="flex items-center gap-3">
        {verificationRequired ? (
          <VerificationBadge status={farm.verificationProfile?.status ?? "PENDING"} />
        ) : (
          <span className="text-sm font-medium text-muted-foreground">Modo pruebas: sin verificacion documental</span>
        )}
        <span className="text-sm text-muted-foreground">{farm.location || "Ubicacion pendiente"}</span>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Editar finca</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {canEdit && gpsSuggestion ? <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">Coordenadas GPS del teléfono precargadas. Comprueba que estás físicamente en la finca. No se guardarán hasta que confirmes «Actualizar finca».</p> : null}
          {canEdit ? <FarmForm
            mode="edit"
            farm={{
              id: farm.id,
              name: farm.name,
              description: farm.description,
              location: farm.location,
              latitude: gpsSuggestion ? candidateLat!.toFixed(7) : farm.latitude?.toString() ?? null,
              longitude: gpsSuggestion ? candidateLon!.toFixed(7) : farm.longitude?.toString() ?? null,
              hectares: farm.hectares?.toString() ?? null,
              primaryImageUrl: farm.primaryImageUrl,
              logoUrl: farm.logoUrl,
            }}
          /> : <p className="text-sm text-muted-foreground">Tu rol permite consultar esta finca, pero no editarla.</p>}
          {canDelete ? <form action={deleteFarmAction}>
            <input type="hidden" name="farmId" value={farm.id} />
            <Button type="submit" variant="outline">
              Eliminar finca
            </Button>
          </form> : null}
        </CardContent>
      </Card>
      {verificationRequired && farm.verificationProfile ? (
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
      {verificationRequired ? (
        <DocumentList
        title="Documentos cargados"
        documents={(farm.verificationProfile?.documents ?? []).map((document) => ({
          id: document.fileId ?? document.id,
          label: document.label,
          type: document.type,
          fileName: document.fileName,
          blobUrl: document.blobUrl,
          mimeType: document.file?.mimeType ?? document.contentType,
        }))}
        />
      ) : null}
    </div>
  );
}
