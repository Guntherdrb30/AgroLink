import { createLivestockOperationAction } from "@/server/actions/livestock-operation-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const operationTypeOptions = [
  { value: "WEIGHING", label: "Pesaje" },
  { value: "VACCINATION", label: "Vacunacion" },
  { value: "DEWORMING", label: "Desparasitacion" },
  { value: "COUNT", label: "Conteo" },
  { value: "HEALTH_REVIEW", label: "Revision sanitaria" },
  { value: "CLASSIFICATION", label: "Clasificacion" },
  { value: "TREATMENT", label: "Tratamiento" },
];

type OperationFormProps = {
  farms: Array<{
    id: string;
    name: string;
  }>;
  animals: Array<{
    id: string;
    internalCode: string;
    visualIdentification: string | null;
    farmId: string;
    farmName: string;
  }>;
};

export function OperationForm({ farms, animals }: OperationFormProps) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={createLivestockOperationAction} className="grid gap-6">
      <div className="grid gap-5 md:grid-cols-3">
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium" htmlFor="title">
            Nombre de jornada
          </label>
          <Input
            id="title"
            name="title"
            placeholder="Control general de lote norte"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="operationDate">
            Fecha de jornada
          </label>
          <Input
            id="operationDate"
            name="operationDate"
            type="date"
            defaultValue={today}
            required
          />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="farmId">
            Finca
          </label>
          <select
            id="farmId"
            name="farmId"
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
        <label className="flex items-center gap-3 rounded-[24px] border border-border/70 bg-muted/40 px-4 py-3 text-sm">
          <input type="checkbox" name="includeAllFarmAnimals" />
          Incluir todos los animales de la finca seleccionada
        </label>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Tipos de trabajo</p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {operationTypeOptions.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-3 rounded-[22px] border border-border/70 bg-white px-4 py-3 text-sm"
            >
              <input type="checkbox" name="plannedTypes" value={option.value} />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Animales incluidos</p>
        <div className="max-h-72 space-y-3 overflow-auto rounded-[28px] border border-border/70 bg-white p-4">
          {animals.map((animal) => (
            <label
              key={animal.id}
              className="flex items-center gap-3 rounded-[20px] border border-border/60 px-4 py-3 text-sm"
            >
              <input type="checkbox" name="animalIds" value={animal.id} />
              <span>
                {animal.internalCode}
                {animal.visualIdentification ? ` - ${animal.visualIdentification}` : ""}
              </span>
              <span className="ml-auto text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {animal.farmName}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="notes">
          Observaciones de planificacion
        </label>
        <Textarea
          id="notes"
          name="notes"
          placeholder="Objetivo de la jornada, instrucciones de campo y restricciones."
        />
      </div>

      <div>
        <Button type="submit">Crear jornada</Button>
      </div>
    </form>
  );
}
