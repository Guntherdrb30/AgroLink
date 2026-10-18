"use client";

import { useState, useTransition, type FormEvent } from "react";

import { createFarmAction, updateFarmAction } from "@/server/actions/farm-actions";
import { validateFarmUploadFile, type FarmUploadKind } from "@/lib/blob/farm-upload-policy";
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

type SignedUpload = { uploadUrl: string; pathname: string };

async function uploadPrivateFarmImage(
  file: File,
  kind: FarmUploadKind,
  farmId: string | null,
): Promise<string> {
  const error = validateFarmUploadFile(kind, file.name, file.type, file.size);
  if (error) throw new Error(error);

  const signedResponse = await fetch("/api/farms/media/sign", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind, farmId, filename: file.name, contentType: file.type, size: file.size,
    }),
  });
  const signed = await signedResponse.json().catch(() => null) as
    (Partial<SignedUpload> & { error?: string }) | null;
  if (!signedResponse.ok || !signed?.uploadUrl || !signed.pathname) {
    throw new Error(signed?.error || "No se pudo autorizar la carga. Revisa tu conexión o sesión.");
  }

  // Direct browser -> PRIVATE Blob. No image body passes through a Server Action.
  const uploadedResponse = await fetch(signed.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!uploadedResponse.ok) {
    throw new Error("No se pudo subir la imagen. Comprueba tu conexión e inténtalo de nuevo.");
  }
  const uploaded = await uploadedResponse.json().catch(() => null) as { pathname?: string } | null;
  if (uploaded?.pathname !== signed.pathname) {
    throw new Error("La carga no pudo confirmarse. Vuelve a intentarlo.");
  }
  return signed.pathname;
}

export function FarmForm({ mode, farm }: FarmFormProps) {
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const action = mode === "create" ? createFarmAction : updateFarmAction;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploading || pending) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const primaryFile = formData.get("primaryImage");
    const logoFile = formData.get("logo");
    // Never send File/Blob via a Server Action: default Next.js body limit is 1 MB.
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
          setProgress(kind === "logo" ? "Subiendo logo de forma privada..." : "Subiendo imagen principal de forma privada...");
          const pathname = await uploadPrivateFarmImage(file, kind, farm?.id ?? null);
          formData.set(kind === "logo" ? "logoPath" : "primaryImagePath", pathname);
        }
      }
      setProgress("Guardando los cambios de la finca...");
      startTransition(async () => {
        try {
          const result = await action(formData);
          if (result?.error) setError(result.error);
        } catch {
          setError("No se pudo completar el guardado. Comprueba tu conexión e inténtalo nuevamente.");
        } finally {
          setUploading(false);
          setProgress("");
        }
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error al subir los archivos.");
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
        <Button type="submit" disabled={uploading || pending}>
          {uploading || pending ? "Procesando..." : mode === "create" ? "Crear finca" : "Actualizar finca"}
        </Button>
      </div>
    </form>
  );
}
