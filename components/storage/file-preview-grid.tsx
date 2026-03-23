type FilePreviewGridProps = {
  files: Array<{
    id: string;
    name: string;
    url: string;
    mimeType: string;
  }>;
};

export function FilePreviewGrid({ files }: FilePreviewGridProps) {
  if (files.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {files.map((file) => {
        const isImage = file.mimeType.startsWith("image/");

        return (
          <div
            key={file.id}
            className="overflow-hidden rounded-[24px] border border-border bg-white"
          >
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={file.url}
                alt={file.name}
                className="h-36 w-full object-cover"
              />
            ) : (
              <div className="flex h-36 items-center justify-center bg-muted px-4 text-center text-sm text-muted-foreground">
                {file.mimeType}
              </div>
            )}
            <div className="border-t border-border px-4 py-3">
              <p className="truncate text-sm font-medium">{file.name}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
