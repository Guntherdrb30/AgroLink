import { submitVerificationProfileAction, uploadFarmVerificationDocumentsAction } from "@/server/actions/verification-actions";
import { FileDropzone } from "@/components/storage/file-dropzone";
import { VerificationBadge } from "@/components/shared/verification-badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type FarmVerificationFormProps = {
  farmId: string;
  profile: {
    id: string;
    status: import("@prisma/client").VerificationStatus;
    notes: string | null;
  };
};

export function FarmVerificationForm({ farmId, profile }: FarmVerificationFormProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Finca
          </p>
          <h2 className="text-2xl font-semibold">Documentacion de finca</h2>
        </div>
        <VerificationBadge status={profile.status} />
      </div>
      <form action={uploadFarmVerificationDocumentsAction} className="grid gap-5">
        <input type="hidden" name="farmId" value={farmId} />
        <div className="grid gap-5 md:grid-cols-3">
          <FileDropzone
            name="farmDocuments"
            label="Documentos de finca"
            description="PDF, JPG o PNG."
            accept="application/pdf,image/jpeg,image/png,image/webp"
            multiple
          />
          <FileDropzone
            name="intiDocuments"
            label="INTI"
            description="PDF, JPG o PNG."
            accept="application/pdf,image/jpeg,image/png,image/webp"
            multiple
          />
          <FileDropzone
            name="farmPhotos"
            label="Fotos de finca"
            description="JPG, PNG o WEBP."
            accept="image/jpeg,image/png,image/webp"
            multiple
          />
        </div>
        <div>
          <Button type="submit" variant="outline">
            Subir documentos de finca
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
        <Button type="submit">Enviar finca a revision</Button>
      </form>
    </div>
  );
}
