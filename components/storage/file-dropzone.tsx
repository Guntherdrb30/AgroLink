"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { FileUp, UploadCloud, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type PreviewFile = {
  id: string;
  name: string;
  url: string;
  mimeType: string;
};

type FileDropzoneProps = {
  name: string;
  label: string;
  description?: string;
  accept?: string;
  multiple?: boolean;
  className?: string;
};

export function FileDropzone({
  name,
  label,
  description,
  accept,
  multiple = false,
  className,
}: FileDropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previews, setPreviews] = useState<PreviewFile[]>([]);

  useEffect(() => {
    return () => {
      for (const preview of previews) {
        URL.revokeObjectURL(preview.url);
      }
    };
  }, [previews]);

  const syncPreviews = () => {
    const files = Array.from(inputRef.current?.files ?? []);

    setPreviews((current) => {
      for (const preview of current) {
        URL.revokeObjectURL(preview.url);
      }

      return files.map((file, index) => ({
        id: `${file.name}-${index}`,
        name: file.name,
        url: URL.createObjectURL(file),
        mimeType: file.type || "application/octet-stream",
      }));
    });
  };

  const handleDrop: React.DragEventHandler<HTMLLabelElement> = (event) => {
    event.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(event.dataTransfer.files);

    if (!inputRef.current || droppedFiles.length === 0) {
      return;
    }

    const dataTransfer = new DataTransfer();

    for (const file of droppedFiles) {
      dataTransfer.items.add(file);
      if (!multiple) {
        break;
      }
    }

    inputRef.current.files = dataTransfer.files;
    syncPreviews();
  };

  const previewItems = useMemo(
    () =>
      previews.map((preview) => {
        const isImage = preview.mimeType.startsWith("image/");

        return (
          <div
            key={preview.id}
            className="overflow-hidden rounded-[24px] border border-border bg-white"
          >
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview.url}
                alt={preview.name}
                className="h-28 w-full object-cover"
              />
            ) : (
              <div className="flex h-28 items-center justify-center bg-muted px-4 text-center text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <FileUp className="mr-2 size-4" />
                Archivo
              </div>
            )}
            <div className="border-t border-border px-4 py-3">
              <p className="truncate text-sm font-medium">{preview.name}</p>
            </div>
          </div>
        );
      }),
    [previews],
  );

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor={inputId}>
          {label}
        </label>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-[28px] border border-dashed border-border bg-muted/60 px-6 py-8 text-center transition-colors",
          isDragging && "border-primary bg-primary/5",
        )}
      >
        <UploadCloud className="size-8 text-primary" />
        <p className="mt-4 text-sm font-medium">
          Arrastra archivos aqui o haz clic para seleccionarlos.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {multiple ? "Puedes seleccionar multiples archivos." : "Un archivo por carga."}
        </p>
      </label>
      <input
        id={inputId}
        ref={inputRef}
        name={name}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={syncPreviews}
      />
      {previews.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Vista previa</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (inputRef.current) {
                  inputRef.current.value = "";
                }
                setPreviews((current) => {
                  for (const preview of current) {
                    URL.revokeObjectURL(preview.url);
                  }

                  return [];
                });
              }}
            >
              <X className="size-4" />
              Limpiar
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">{previewItems}</div>
        </div>
      ) : null}
    </div>
  );
}
