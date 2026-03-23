import { createFarmAction, updateFarmAction } from "@/server/actions/farm-actions";
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

export function FarmForm({ mode, farm }: FarmFormProps) {
  const action = mode === "create" ? createFarmAction : updateFarmAction;
  const existingAssets = [
    farm?.primaryImageUrl
      ? {
          id: "primary-image",
          name: "Imagen principal actual",
          url: farm.primaryImageUrl,
          mimeType: "image/*",
        }
      : null,
    farm?.logoUrl
      ? {
          id: "logo",
          name: "Logo actual",
          url: farm.logoUrl,
          mimeType: "image/*",
        }
      : null,
  ].filter(Boolean) as Array<{
    id: string;
    name: string;
    url: string;
    mimeType: string;
  }>;

  return (
    <form action={action} className="grid gap-5">
      {farm ? <input type="hidden" name="farmId" value={farm.id} /> : null}
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="name">
            Nombre
          </label>
          <Input id="name" name="name" defaultValue={farm?.name} required />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="location">
            Ubicacion
          </label>
          <Input
            id="location"
            name="location"
            defaultValue={farm?.location ?? ""}
            placeholder="Municipio, estado, pais"
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="description">
          Descripcion
        </label>
        <Textarea
          id="description"
          name="description"
          defaultValue={farm?.description ?? ""}
          placeholder="Resumen operativo de la finca"
        />
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="latitude">
            Latitud
          </label>
          <Input
            id="latitude"
            name="latitude"
            defaultValue={farm?.latitude ?? ""}
            placeholder="8.1234567"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="longitude">
            Longitud
          </label>
          <Input
            id="longitude"
            name="longitude"
            defaultValue={farm?.longitude ?? ""}
            placeholder="-67.1234567"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="hectares">
            Hectareas
          </label>
          <Input
            id="hectares"
            name="hectares"
            defaultValue={farm?.hectares ?? ""}
            placeholder="450.50"
          />
        </div>
      </div>
      {existingAssets.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm font-medium">Activos actuales</p>
          <FilePreviewGrid files={existingAssets} />
        </div>
      ) : null}
      <div className="grid gap-5 md:grid-cols-2">
        <FileDropzone
          name="primaryImage"
          label="Imagen principal"
          description="JPEG, PNG o WEBP hasta 10 MB."
          accept="image/jpeg,image/png,image/webp"
        />
        <FileDropzone
          name="logo"
          label="Logo"
          description="JPEG, PNG, WEBP o SVG hasta 5 MB."
          accept="image/jpeg,image/png,image/webp,image/svg+xml"
        />
      </div>
      <div>
        <Button type="submit">
          {mode === "create" ? "Crear finca" : "Actualizar finca"}
        </Button>
      </div>
    </form>
  );
}
