import {
  addAnimalEventAction,
  addAnimalTreatmentAction,
  addAnimalVaccinationAction,
  addAnimalWeightAction,
} from "@/server/actions/livestock-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const eventOptions = [
  { value: "NOTE", label: "Nota" },
  { value: "TRANSFER", label: "Traslado" },
  { value: "SALE", label: "Venta" },
  { value: "REPRODUCTION", label: "Reproduccion" },
  { value: "OTHER", label: "Otro" },
];

type AnimalRecordFormsProps = {
  animalId: string;
};

export function AnimalRecordForms({ animalId }: AnimalRecordFormsProps) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Registrar peso</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addAnimalWeightAction} className="grid gap-4">
            <input type="hidden" name="animalId" value={animalId} />
            <Input name="weightKg" placeholder="Peso en kg" required />
            <Input name="recordedAt" type="date" defaultValue={today} required />
            <Textarea name="note" placeholder="Observacion del pesaje" />
            <Button type="submit">Guardar peso</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registrar evento</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addAnimalEventAction} className="grid gap-4">
            <input type="hidden" name="animalId" value={animalId} />
            <select
              name="eventType"
              defaultValue="NOTE"
              className="flex h-11 w-full rounded-[22px] border border-input bg-background px-4 text-sm"
            >
              {eventOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Input name="title" placeholder="Titulo del evento" required />
            <Input name="eventDate" type="date" defaultValue={today} required />
            <Textarea name="description" placeholder="Detalle operacional" />
            <Button type="submit" variant="outline">
              Guardar evento
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registrar vacunacion</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addAnimalVaccinationAction} className="grid gap-4">
            <input type="hidden" name="animalId" value={animalId} />
            <Input name="vaccineName" placeholder="Nombre de vacuna" required />
            <div className="grid gap-4 md:grid-cols-2">
              <Input name="appliedAt" type="date" defaultValue={today} required />
              <Input name="nextDueAt" type="date" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input name="dose" placeholder="Dosis" />
              <Input name="batch" placeholder="Lote" />
            </div>
            <Textarea name="note" placeholder="Observacion sanitaria" />
            <Button type="submit">Guardar vacunacion</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registrar tratamiento</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addAnimalTreatmentAction} className="grid gap-4">
            <input type="hidden" name="animalId" value={animalId} />
            <Input name="treatmentName" placeholder="Nombre de tratamiento" required />
            <div className="grid gap-4 md:grid-cols-2">
              <Input name="appliedAt" type="date" defaultValue={today} required />
              <Input name="withdrawalUntil" type="date" />
            </div>
            <Input name="diagnosis" placeholder="Diagnostico" />
            <div className="grid gap-4 md:grid-cols-2">
              <Input name="medicine" placeholder="Medicamento" />
              <Input name="dose" placeholder="Dosis" />
            </div>
            <Textarea name="note" placeholder="Nota de seguimiento" />
            <Button type="submit" variant="outline">
              Guardar tratamiento
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
