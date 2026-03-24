import { reviewVerificationProfileAction } from "@/server/actions/verification-actions";
import { VerificationBadge } from "@/components/shared/verification-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type ReviewQueueProps = {
  profiles: Array<{
    id: string;
    subjectType: string;
    status: import("@prisma/client").VerificationStatus;
    tenantName: string;
    farmName?: string | null;
    documentsCount: number;
    notes?: string | null;
  }>;
};

export function ReviewQueue({ profiles }: ReviewQueueProps) {
  if (profiles.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">
            No hay perfiles en cola de revision.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-5">
      {profiles.map((profile) => (
        <Card key={profile.id}>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div className="space-y-2">
              <CardTitle>
                {profile.subjectType === "TENANT"
                  ? profile.tenantName
                  : profile.farmName || "Finca"}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {profile.subjectType === "TENANT" ? "Cuenta" : "Finca"} ·{" "}
                {profile.documentsCount} documentos
              </p>
            </div>
            <VerificationBadge status={profile.status} />
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={reviewVerificationProfileAction} className="grid gap-4">
              <input type="hidden" name="profileId" value={profile.id} />
              <Textarea
                name="comment"
                defaultValue={profile.notes ?? ""}
                placeholder="Comentario para la cuenta o la finca"
              />
              <div className="flex flex-wrap gap-3">
                <Button type="submit" name="action" value="start_review" variant="outline">
                  Marcar en revision
                </Button>
                <Button type="submit" name="action" value="approve">
                  Aprobar
                </Button>
                <Button type="submit" name="action" value="request_fix" variant="outline">
                  Pedir correccion
                </Button>
                <Button type="submit" name="action" value="reject" variant="outline">
                  Rechazar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
