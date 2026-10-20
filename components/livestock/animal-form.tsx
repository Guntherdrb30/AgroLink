"use client";

import { useRef, useState, type FormEvent } from "react";

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
  const guided = mode === "create";
  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  function checkStep(index: number) {
    const form = formRef.current;
    if (!form) return false;
    const get = (name: string) => {
      const control = form.elements.namedItem(name);
      return control instanceof HTMLInputElement || control instanceof HTMLSelectElement
        ? control.value.trim()
        : "";
    };
    if (index === 0) {
      if (get("internalCode").length < 2 || get("internalCode").length > 60) {
        setStepError("Escribe un código interno de 2 a 60 caracteres.");
        (form.elements.namedItem("internalCode") as HTMLInputElement | null)?.focus();
        return false;
      }
      if (get("speciesName").length < 2 || get("speciesName").length > 80) {
        setStepError("Escribe el nombre de la especie.");
        (form.elements.namedItem("speciesName") as HTMLInputElement | null)?.focus();
        return false;
      }
    }
    if (index === 1) {
      if (!get("farmId")) {
        setStepError("Debes seleccionar una finca.");
        (form.elements.namedItem("farmId") as HTMLSelectElement | null)?.focus();
        return false;
      }
      if (!get("birthDate") && !get("estimatedAgeMonths")) {
        setStepError("Indica la fecha de nacimiento o la edad estimada en meses.");
        (form.elements.namedItem("estimatedAgeMonths") as HTMLInputElement | null)?.focus();
        return false;
      }
      if (get("estimatedAgeMonths") && !/^\\d+$/.test(get("estimatedAgeMonths"))) {
        setStepError("La edad estimada debe ser un número entero de meses.");
        (form.elements.namedItem("estimatedAgeMonths") as HTMLInputElement | null)?.focus();
        return false;
      }
    }
    setStepError("");
    return true;
  }

  function nextStep() {
    if (!checkStep(step)) return;
    setStep((value) => Math.min(2, value + 1));
  }

  function submitIfValid(event: FormEvent<HTMLFormElement>) {
    if (!guided) return;
    for (const index of [0, 1]) {
      if (!checkStep(index)) {
        event.preventDefault();
        setStep(index);
        return;
      }
    }
  }

  return (
    <form ref={formRef} action={action} onSubmit={submitIfValid} className="grid gap-5">
      {animal ? <input type="hidden" name="animalId" value={animal.id} /> : null}
      {guided ? (
        <div className="flex items-center gap-1.5" aria-label="Progreso de registro">
          {["Identidad", "Finca", "Detalles"].map((label, index) => (
            <span key={label} aria-current={step === index ? "step" : undefined}
              className={"min-w-0 flex-1 rounded-xl px-1.5 py-3 text-center text-[11px] font-bold sm:text-sm " +
                (step === index ? "bg-[#1b3d2c] text-white" : "bg-[#f0f3ee] text-[#647465]")}>
              {index + 1}. {label}
            </span>
          ))}
        </div>
      ) : null}
      <div className={guided && step !== 0 ? "hidden" : "space-y-5"}>
      <div className="grid gap-5 md:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="internalCode">
            Codigo interno
          </label>
          <Input
            id="internalCode"
            name="internalCode"
            defaultValue={animal?.internalCode}
            minLength={2}
            maxLength={60}
            required={!guided || step === 0}
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
            minLength={2}
            maxLength={80}
            required={!guided || step === 0}
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

      </div>
      <div className={guided && step !== 1 ? "hidden" : "space-y-5"}>
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
            required={!guided || step === 1}
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

      </div>
      <div className={guided && step !== 2 ? "hidden" : "space-y-5"}>
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

      </div>
      {stepError && guided ? (
        <p role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          {stepError}
        </p>
      ) : null}
      {guided ? (
        <div className="flex items-center justify-between gap-3 border-t border-[#e7ece5] pt-5">
          {step > 0 ? (
            <Button variant="outline" type="button" onClick={() => { setStepError(""); setStep((value) => Math.max(0, value - 1)); }}>
              Anterior
            </Button>
          ) : <span />}
          {step < 2 ? (
            <Button type="button" onClick={nextStep}>Continuar</Button>
          ) : (
            <Button type="submit" className="min-h-11">Registrar animal</Button>
          )}
        </div>
      ) : (
        <Button type="submit" className="w-full sm:w-auto">Actualizar ficha</Button>
      )}
    </form>
  );
}
