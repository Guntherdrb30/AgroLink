"use client";

import { useState, type FormEvent } from "react";

import { MAX_SERVER_FARM_UPLOAD_BYTES, validateFarmUploadFile, type FarmUploadKind } from "@/lib/blob/farm-upload-policy";
import { FileDropzone } from "@/components/storage/file-dropzone";
import { FilePreviewGrid } from "@/components/storage/file-preview-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type FarmFormProps = {
  mode: "create" | "edit";
  farm?: {
    id: string;
    name: string;
    description: string | null;
    location: string | null;
    latitude: string | null;
    longitude: string | null;
    hectares: string | null;
    primaryImageUrl?: string | null;
    logoUrl?: string | null;
  };
};

/**
 * Vercel Blob's private signed-PUT host is cross-origin. A direct browser PUT
 * may be blocked on mobile networks/CORS, so stage a safely-sized image via
 * our same-origin, Clerk-protected API instead. Larger source images are
 * optimized locally; the raw file is never passed to a Server Action.
 */
async function optimizeImageForFarm(file: File): Promise<File> {
  if (file.size <= MAX_SERVER_FARM_UPLOAD_BYTES) return file;

  if (typeof createImageBitmap !== "function") {
    throw new Error("Este navegador no puede optimizar imágenes grandes. Abre la página en Chrome actualizado.");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("No se pudo abrir la fotografía seleccionada. Comprueba que no esté dañada.");
  }

  try {
    if (!bitmap.width || !bitmap.height) throw new Error("La imagen no tiene dimensiones válidas.");
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) throw new Error("Este navegador no puede preparar la imagen para su carga.");

    for (const maxEdge of [3200, 2800, 2400, 2000, 1600, 1200, 900]) {
      const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      for (const quality of [0.9, 0.8, 0.68, 0.55]) {
        const compressed = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/webp", quality));
        if (!compressed || compressed.type !== "image/webp") {
          throw new Error("El navegador no admite la optimización WEBP. Intenta con otra fotografía.");
        }
        if (compressed.size > 0 && compressed.size <= MAX_SERVER_FARM_UPLOAD_BYTES) {
          const safeBase = file.name.replace(/\.[^.]+$/, "").slice(0, 80) || "finca";
          return new File([compressed], safeBase + ".webp", {
            type: "image/webp",
            lastModified: Date.now(),
          });
        }
      }
    }
    throw new Error("La fotografía es demasiado compleja para optimizarla. Prueba otra imagen.");
  } finally {
    bitmap.close();
  }
}

async function uploadPrivateFarmImage(
  originalFile: File,
  kind: FarmUploadKind,
  farmId: string | null,
  onProgress: (message: string) => void,
): Promise<string> {
  const validation = validateFarmUploadFile(kind, originalFile.name, originalFile.type, originalFile.size);
  if (validation) throw new Error(validation);

  if (originalFile.size > MAX_SERVER_FARM_UPLOAD_BYTES) {
    onProgress("Optimizando la fotografía en tu teléfono, sin perder la imagen original...");
  }
  const file = await optimizeImageForFarm(originalFile);
  onProgress(kind === "logo" ? "Subiendo logo de forma privada..." : "Subiendo imagen de forma privada...");

  const query = new URLSearchParams({ kind, filename: file.name });
  if (farmId) query.set("farmId", farmId);
  let response: Response;
  try {
    response = await fetch("/api/farms/media/stage?" + query, {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": file.type },
      body: file,
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor de imágenes. Comprueba la conexión e inténtalo de nuevo.");
  }
  const payload = await response.json().catch(() => null) as {
    pathname?: string;
    error?: string;
  } | null;
  if (!response.ok || !payload?.pathname) {
    throw new Error(payload?.error ?? (
      response.status === 413
        ? "La foto es demasiado grande para esta conexión. Prueba otra fotografía."
        : "No se pudo subir la imagen. Vuelve a intentarlo."
    ));
  }
  return payload.pathname;
}

export function FarmForm({ mode, farm }: FarmFormProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploading) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const primaryFile = formData.get("primaryImage");
    const logoFile = formData.get("logo");
    // Only short, tenant-scoped Blob path references go into the JSON write.
    formData.delete("primaryImage");
    formData.delete("logo");

    setUploading(true);
    setError(null);
    try {
      for (const [kind, file] of [
        ["primaryImage", primaryFile],
        ["logo", logoFile],
      ] as const) {
        if (file instanceof File && file.size > 0) {
          const pathname = await uploadPrivateFarmImage(file, kind, farm?.id ?? null, setProgress);
          formData.set(kind === "logo" ? "logoPath" : "primaryImagePath", pathname);
        }
      }
      setProgress("Guardando los cambios de la finca...");
      if (mode === "edit" && !farm?.id) {
        throw new Error("No se pudo identificar la finca para actualizarla.");
      }

      const fields = ["name", "description", "location", "latitude", "longitude", "hectares"] as const;
      const farmInput = Object.fromEntries(
        fields.map((key) => [key, String(formData.get(key) ?? "")]),
      );
      const assets = {
        primaryImagePath: String(formData.get("primaryImagePath") ?? "") || null,
        logoPath: String(formData.get("logoPath") ?? "") || null,
      };

      // A same-origin API write avoids obsolete Next.js Server Action references
      // in installed PWAs after deployments, and returns useful HTTP errors.
      const url = mode === "edit" ? "/api/farms/" + encodeURIComponent(farm!.id) : "/api/farms";
      let response: Response;
      try {
        response = await fetch(url, {
          method: mode === "edit" ? "PATCH" : "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ farm: farmInput, assets }),
        });
      } catch {
        throw new Error("No se pudo conectar con el servidor al guardar. Verifica la conexión y vuelve a intentar.");
      }

      const result = await response.json().catch(() => null) as {
        farmId?: string;
        error?: string;
      } | null;
      if (!response.ok || !result?.farmId) {
        throw new Error(result?.error ?? "No se pudo guardar la finca (HTTP " + response.status + ").");
      }

      window.location.assign(
        "/farms/" + encodeURIComponent(result.farmId) +
        "?success=" + (mode === "edit" ? "updated" : "created"),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error al subir los archivos.");
    } finally {
      setUploading(false);
      setProgress("");
    }
  }

  const existingAssets = [
    farm?.primaryImageUrl ? {
      id: "primary-image", name: "Imagen principal actual",
      url: farm.primaryImageUrl, mimeType: "image/*",
    } : null,
    farm?.logoUrl ? {
      id: "logo", name: "Logo actual", url: farm.logoUrl, mimeType: "image/*",
    } : null,
  ].filter(Boolean) as Array<{ id: string; name: string; url: string; mimeType: string }>;

  return (
    <form onSubmit={(event) => { void handleSubmit(event); }} className="grid gap-5">
      {farm ? <input type="hidden" name="farmId" value={farm.id} /> : null}
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="name">Nombre</label>
          <Input id="name" name="name" defaultValue={farm?.name} required />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="location">Ubicación</label>
          <Input id="location" name="location" defaultValue={farm?.location ?? ""} placeholder="Municipio, estado, país" />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="description">Descripción</label>
        <Textarea id="description" name="description" defaultValue={farm?.description ?? ""} placeholder="Resumen operativo de la finca" />
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="latitude">Latitud</label>
          <Input id="latitude" name="latitude" defaultValue={farm?.latitude ?? ""} placeholder="8.1234567" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="longitude">Longitud</label>
          <Input id="longitude" name="longitude" defaultValue={farm?.longitude ?? ""} placeholder="-67.1234567" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="hectares">Hectáreas</label>
          <Input id="hectares" name="hectares" defaultValue={farm?.hectares ?? ""} placeholder="450.50" />
        </div>
      </div>
      {existingAssets.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm font-medium">Activos actuales</p>
          <FilePreviewGrid files={existingAssets} />
        </div>
      ) : null}
      <div className="grid gap-5 md:grid-cols-2">
        <FileDropzone name="primaryImage" label="Imagen principal" description="JPEG, PNG o WEBP hasta 10 MB." accept="image/jpeg,image/png,image/webp" />
        <FileDropzone name="logo" label="Logo" description="JPEG, PNG o WEBP hasta 5 MB." accept="image/jpeg,image/png,image/webp" />
      </div>
      {progress && <p role="status" className="text-sm text-muted-foreground">{progress}</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      <div>
        <Button type="submit" disabled={uploading}>
          {uploading ? "Procesando..." : mode === "create" ? "Crear finca" : "Actualizar finca"}
        </Button>
      </div>
    </form>
  );
}
