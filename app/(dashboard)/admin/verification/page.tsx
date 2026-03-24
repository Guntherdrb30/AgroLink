import { listVerificationProfilesForReview } from "@/server/repositories/verification-repository";
import { requireRole } from "@/lib/auth/session";
import { ReviewQueue } from "@/components/verification/review-queue";
import { PageHeader } from "@/components/shared/page-header";

export const dynamic = "force-dynamic";

export default async function AdminVerificationPage() {
  await requireRole({
    platform: ["ROOT", "PLATFORM_ADMIN"],
  });

  const profiles = await listVerificationProfilesForReview([
    "PENDING",
    "IN_REVIEW",
    "REQUIRES_FIX",
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Revision administrativa"
        title="Revision documental de cuentas y fincas"
        description="La plataforma aprueba, solicita correcciones o rechaza expedientes desde esta cola centralizada."
      />
      <ReviewQueue
        profiles={profiles.map((profile) => ({
          id: profile.id,
          subjectType: profile.subjectType,
          status: profile.status,
          tenantName: profile.tenant.name,
          farmName: profile.farm?.name,
          documentsCount: profile.documents.length,
          notes: profile.notes,
        }))}
      />
    </div>
  );
}
