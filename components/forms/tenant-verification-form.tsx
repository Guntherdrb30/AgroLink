import { submitVerificationProfileAction, uploadTenantVerificationDocumentsAction } from "@/server/actions/verification-actions";
import { FileDropzone } from "@/components/storage/file-dropzone";
import { VerificationBadge } from "@/components/shared/verification-badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type TenantVerificationFormProps = {
  profile: {
    id: string;
    status: import("@prisma/client").VerificationStatus;
    notes: string | null;
  };
};

export function TenantVerificationForm({
  profile,
}: TenantVerificationFormProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Cuenta
          </p>
          <h2 className="text-2xl font-semibold">Verificacion de cuenta</h2>
        </div>
        <VerificationBadge status={profile.status} />
      </div>
      <form action={uploadTenantVerificationDocumentsAction} className="grid gap-5">
        <div className="grid gap-5 md:grid-cols-2">
          <FileDropzone
            name="identityDocuments"
            label="Documentos de identidad"
            description="PDF, JPG o PNG hasta 15 MB por archivo."
            accept="application/pdf,image/jpeg,image/png,image/webp"
            multiple
          />
          <FileDropzone
            name="companyDocuments"
            label="Documentos de empresa"
            description="PDF, JPG o PNG hasta 15 MB por archivo."
            accept="application/pdf,image/jpeg,image/png,image/webp"
            multiple
          />
        </div>
        <div>
          <Button type="submit" variant="outline">
            Subir documentos de cuenta
          </Button>
        </div>
      </form>
      <form action={submitVerificationProfileAction} className="space-y-4">
        <input type="hidden" name="profileId" value={profile.id} />
        <Textarea
          value={profile.notes ?? ""}
          readOnly
          placeholder="Las observaciones del revisor apareceran aqui."
        />
        <Button type="submit">Enviar cuenta a revision</Button>
      </form>
    </div>
  );
}
