import {
  createAnimalAction,
  updateAnimalAction,
} from "@/server/actions/livestock-actions";
import { FileDropzone } from "@/components/storage/file-dropzone";
import { FilePreviewGrid } from "@/components/storage/file-preview-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const sexOptions = [
  { value: "FEMALE", label: "Hembra" },
  { value: "MALE", label: "Macho" },
  { value: "UNKNOWN", label: "No definido" },
];

const productiveLineOptions = [
  { value: "BEEF", label: "Carne" },
  { value: "DAIRY", label: "Leche" },
  { value: "DUAL_PURPOSE", label: "Doble proposito" },
  { value: "BREEDING", label: "Cria" },
  { value: "WORK", label: "Trabajo" },
  { value: "OTHER", label: "Otro" },
];

const healthStatusOptions = [
  { value: "HEALTHY", label: "Sano" },
  { value: "UNDER_OBSERVATION", label: "Observacion" },
  { value: "SICK", label: "Enfermo" },
  { value: "RECOVERING", label: "Recuperacion" },
  { value: "QUARANTINE", label: "Cuarentena" },
];

const reproductiveStatusOptions = [
  { value: "OPEN", label: "Abierta" },
  { value: "PREGNANT", label: "Prenada" },
  { value: "LACTATING", label: "Lactando" },
  { value: "BREEDING_MALE", label: "Reproductor" },
  { value: "CASTRATED", label: "Castrado" },
  { value: "YOUNG", label: "Cria" },
  { value: "UNKNOWN", label: "No definido" },
];

type AnimalFormProps = {
  mode: "create" | "edit";
  animal?: {
    id: string;
    internalCode: string;
    visualIdentification: string | null;
    chipCode: string | null;
    speciesName: string;
    breedName: string | null;
    sex: string;
    birthDate: string;
    estimatedAgeMonths: string;
    farmId: string;
    lotOrZone: string | null;
    productiveLine: string;
    fatherId: string;
    motherId: string;
    initialWeightKg: string;
    currentWeightKg: string;
    healthStatus: string;
    reproductiveStatus: string;
    origin: string;
    notes: string;
  };
  farms: Array<{
    id: string;
    name: string;
  }>;
  relationAnimals: Array<{
    id: string;
    label: string;
  }>;
  photos?: Array<{
    id: string;
    name: string;
    url: string;
    mimeType: string;
  }>;
};

export function AnimalForm({
  mode,
  animal,
  farms,
  relationAnimals,
  photos = [],
}: AnimalFormProps) {
  const action = mode === "create" ? createAnimalAction : updateAnimalAction;

  return (
    <form action={action} className="grid gap-6">
      {animal ? <input type="hidden" name="animalId" value={animal.id} /> : null}
      <div className="grid gap-5 md:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="internalCode">
            Codigo interno
          </label>
          <Input
            id="internalCode"
            name="internalCode"
            defaultValue={animal?.internalCode}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="visualIdentification">
            Identificacion visual
          </label>
          <Input
            id="visualIdentification"
            name="visualIdentification"
            defaultValue={animal?.visualIdentification ?? ""}
            placeholder="Chapeta, color o marca"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="chipCode">
            Chip
          </label>
          <Input
            id="chipCode"
            name="chipCode"
            defaultValue={animal?.chipCode ?? ""}
            placeholder="Opcional"
          />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="speciesName">
            Especie
          </label>
          <Input
            id="speciesName"
            name="speciesName"
            defaultValue={animal?.speciesName}
            placeholder="Bovino"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="breedName">
            Raza
          </label>
          <Input
            id="breedName"
            name="breedName"
            defaultValue={animal?.breedName ?? ""}
            placeholder="Brahman, Senepol, Criollo"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="sex">
            Sexo
          </label>
          <select
            id="sex"
            name="sex"
            defaultValue={animal?.sex ?? "UNKNOWN"}
            className="flex h-11 w-full rounded-[22px] border border-input bg-background px-4 text-sm"
          >
            {sexOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="birthDate">
            Fecha de nacimiento
          </label>
          <Input
            id="birthDate"
            name="birthDate"
            type="date"
            defaultValue={animal?.birthDate ?? ""}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="estimatedAgeMonths">
            Edad estimada (meses)
          </label>
          <Input
            id="estimatedAgeMonths"
            name="estimatedAgeMonths"
            defaultValue={animal?.estimatedAgeMonths ?? ""}
            placeholder="Solo si no conoce la fecha"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="farmId">
            Finca
          </label>
          <select
            id="farmId"
            name="farmId"
            defaultValue={animal?.farmId ?? farms[0]?.id}
            className="flex h-11 w-full rounded-[22px] border border-input bg-background px-4 text-sm"
            required
          >
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="lotOrZone">
            Lote o zona
          </label>
          <Input
            id="lotOrZone"
            name="lotOrZone"
            defaultValue={animal?.lotOrZone ?? ""}
            placeholder="Lote 3 / Corral Norte"
          />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="productiveLine">
            Linea productiva
          </label>
          <select
            id="productiveLine"
            name="productiveLine"
            defaultValue={animal?.productiveLine ?? "OTHER"}
            className="flex h-11 w-full rounded-[22px] border border-input bg-background px-4 text-sm"
          >
            {productiveLineOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="fatherId">
            Padre
          </label>
          <select
            id="fatherId"
            name="fatherId"
            defaultValue={animal?.fatherId ?? ""}
            className="flex h-11 w-full rounded-[22px] border border-input bg-background px-4 text-sm"
          >
            <option value="">Sin relacion</option>
            {relationAnimals.map((relationAnimal) => (
              <option key={relationAnimal.id} value={relationAnimal.id}>
                {relationAnimal.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="motherId">
            Madre
          </label>
          <select
            id="motherId"
            name="motherId"
            defaultValue={animal?.motherId ?? ""}
            className="flex h-11 w-full rounded-[22px] border border-input bg-background px-4 text-sm"
          >
            <option value="">Sin relacion</option>
            {relationAnimals.map((relationAnimal) => (
              <option key={relationAnimal.id} value={relationAnimal.id}>
                {relationAnimal.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="origin">
            Origen
          </label>
          <Input
            id="origin"
            name="origin"
            defaultValue={animal?.origin ?? ""}
            placeholder="Nacimiento, compra, traslado"
          />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="initialWeightKg">
            Peso inicial (kg)
          </label>
          <Input
            id="initialWeightKg"
            name="initialWeightKg"
            defaultValue={animal?.initialWeightKg ?? ""}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="currentWeightKg">
            Peso actual (kg)
          </label>
          <Input
            id="currentWeightKg"
            name="currentWeightKg"
            defaultValue={animal?.currentWeightKg ?? ""}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="healthStatus">
            Estado sanitario
          </label>
          <select
            id="healthStatus"
            name="healthStatus"
            defaultValue={animal?.healthStatus ?? "HEALTHY"}
            className="flex h-11 w-full rounded-[22px] border border-input bg-background px-4 text-sm"
          >
            {healthStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="reproductiveStatus">
            Estado reproductivo
          </label>
          <select
            id="reproductiveStatus"
            name="reproductiveStatus"
            defaultValue={animal?.reproductiveStatus ?? "UNKNOWN"}
            className="flex h-11 w-full rounded-[22px] border border-input bg-background px-4 text-sm"
          >
            {reproductiveStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="notes">
          Observaciones
        </label>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={animal?.notes ?? ""}
          placeholder="Notas de manejo, comportamiento o informacion operativa."
        />
      </div>

      {photos.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm font-medium">Fotos registradas</p>
          <FilePreviewGrid files={photos} />
        </div>
      ) : null}

      <FileDropzone
        name="photos"
        label="Fotos"
        description="JPEG, PNG o WEBP hasta 10 MB. Puedes subir varias imagenes."
        accept="image/jpeg,image/png,image/webp"
        multiple
      />

      <div>
        <Button type="submit">
          {mode === "create" ? "Crear animal" : "Actualizar ficha"}
        </Button>
      </div>
    </form>
  );
}
