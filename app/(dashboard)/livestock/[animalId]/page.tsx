import { notFound } from "next/navigation";

import { requireOperationalTenant, requireRole } from "@/lib/auth/session";
import { deleteAnimalAction } from "@/server/actions/livestock-actions";
import { getAnimalDetailData } from "@/server/queries/livestock-query";
import { AnimalForm } from "@/components/livestock/animal-form";
import { AnimalGenealogy } from "@/components/livestock/animal-genealogy";
import { AnimalHealthHistory } from "@/components/livestock/animal-health-history";
import { AnimalRecordForms } from "@/components/livestock/animal-record-forms";
import { AnimalSummary } from "@/components/livestock/animal-summary";
import { AnimalTimeline } from "@/components/livestock/animal-timeline";
import { AnimalWeightHistory } from "@/components/livestock/animal-weight-history";
import { FilePreviewGrid } from "@/components/storage/file-preview-grid";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const viewerRoles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "FARM_MANAGER",
  "ACCOUNTING",
  "OPERATOR",
] as const;

const managementRoles = ["TENANT_OWNER", "TENANT_ADMIN", "FARM_MANAGER", "OPERATOR"];

type AnimalDetailPageProps = {
  params: Promise<{
    animalId: string;
  }>;
};

export default async function AnimalDetailPage({
  params,
}: AnimalDetailPageProps) {
  const { animalId } = await params;
  const { tenantContext } = await requireRole({
    tenant: [...viewerRoles],
  });
  await requireOperationalTenant();

  if (!tenantContext) {
    notFound();
  }

  const data = await getAnimalDetailData(tenantContext.tenant.id, animalId);

  if (!data) {
    notFound();
  }

  const canManage = managementRoles.includes(tenantContext.membership.role);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Ficha animal"
        title={data.animal.internalCode}
        description="Vista operativa para identidad, genealogia, sanidad, peso y trazabilidad cronologica del animal."
      />

      <AnimalSummary
        animal={data.animal}
        mainPhotoUrl={data.photos[0]?.url ?? null}
      />

      <AnimalGenealogy
        father={data.parents.father}
        mother={data.parents.mother}
      />

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Actualizar ficha</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <AnimalForm
              mode="edit"
              animal={data.animal}
              farms={data.formOptions.farms}
              relationAnimals={data.formOptions.relationAnimals}
              photos={data.photos}
            />
            <form action={deleteAnimalAction}>
              <input type="hidden" name="animalId" value={data.animal.id} />
              <Button type="submit" variant="outline">
                Eliminar animal
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {canManage ? <AnimalRecordForms animalId={data.animal.id} /> : null}

      {data.photos.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Galeria</CardTitle>
          </CardHeader>
          <CardContent>
            <FilePreviewGrid files={data.photos} />
          </CardContent>
        </Card>
      ) : null}

      <AnimalWeightHistory records={data.weightHistory} />
      <AnimalHealthHistory
        vaccinations={data.vaccinationHistory}
        treatments={data.treatmentHistory}
      />
      <AnimalTimeline items={data.timeline} />
    </div>
  );
}
