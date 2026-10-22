import { textoEs } from "@/lib/i18n/labels";
import Link from "next/link";

import { FilePreviewGrid } from "@/components/storage/file-preview-grid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DocumentListProps = {
  title: string;
  documents: Array<{
    id: string;
    label: string;
    type: string;
    fileName: string;
    mimeType?: string;
  }>;
};

export function DocumentList({ title, documents }: DocumentListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin documentos cargados.</p>
        ) : (
          <>
            <FilePreviewGrid
              files={documents.map((document) => ({
                id: document.id,
                name: document.fileName,
                url: `/api/files/${document.id}`,
                mimeType: document.mimeType || "application/octet-stream",
              }))}
            />
            <div className="space-y-3">
              {documents.map((document) => (
                <div
                  key={document.id}
                  className="flex items-center justify-between rounded-2xl bg-muted px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{document.fileName}</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      {textoEs(document.type)}
                    </p>
                  </div>
                  <Link
                    href={`/api/files/${document.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-primary"
                  >
                    Ver
                  </Link>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
