"use client";
import { useState } from "react";
import { addReproductionRecordAction } from "@/server/actions/livestock-actions";
import { REPRODUCTION_LABELS, type ReproductionKind, type ReproductionRecord } from "@/lib/livestock/reproduction";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function AnimalReproduction({ animalId, canManage, records, nextCheckAt, sex }: {
  animalId: string; canManage: boolean; records: ReproductionRecord[];
  nextCheckAt: string | null; sex: string;
}) {
  const [kind, setKind] = useState<ReproductionKind>("SERVICE");
  const today = new Date().toISOString().slice(0, 10);
  return <Card>
    <CardHeader><CardTitle>Seguimiento reproductivo</CardTitle></CardHeader>
    <CardContent className="space-y-5">
      {nextCheckAt ? <p className="rounded-xl border p-3 text-sm">Próximo control programado: <strong>{nextCheckAt}</strong></p> :
        <p className="text-sm text-muted-foreground">No hay un control reproductivo pendiente registrado.</p>}
      {canManage && sex === "FEMALE" ? <form action={addReproductionRecordAction} className="grid gap-4">
        <input type="hidden" name="animalId" value={animalId}/>
        <label className="space-y-1 text-sm">Tipo de registro
          <select name="kind" value={kind} onChange={event => setKind(event.target.value as ReproductionKind)} className="block h-11 w-full rounded-xl border px-3">
            {Object.entries(REPRODUCTION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm">Fecha del evento<Input type="date" name="eventDate" defaultValue={today} required /></label>
        {kind === "SERVICE" ? <>
          <label className="space-y-1 text-sm">Método<select name="method" className="block h-11 w-full rounded-xl border px-3" required><option value="NATURAL">Monta natural</option><option value="INSEMINATION">Inseminación</option></select></label>
          <Input name="sireCode" placeholder="Código del reproductor o semen (opcional)" maxLength={80}/>
        </> : null}
        {kind === "PREGNANCY_CHECK" ? <label className="space-y-1 text-sm">Diagnóstico
          <select name="pregnancyResult" required className="block h-11 w-full rounded-xl border px-3">
            <option value="POSITIVE">Positivo</option><option value="NEGATIVE">Negativo</option><option value="INCONCLUSIVE">Inconcluso</option>
          </select>
        </label> : null}
        {kind === "CALVING" ? <Input name="calfCode" placeholder="Identificación de la cría (si existe)" maxLength={80}/> : null}
        <label className="space-y-1 text-sm">Próximo control (opcional)<Input type="date" name="nextCheckAt"/></label>
        {kind === "PREGNANCY_CHECK" ? <label className="space-y-1 text-sm">Fecha estimada de parto (si la determina el veterinario)<Input type="date" name="expectedCalvingAt"/></label> : null}
        <Textarea name="note" placeholder="Observaciones del evento, responsable o veterinario" maxLength={500}/>
        <Button type="submit">Guardar registro reproductivo</Button>
      </form> : null}
      {sex !== "FEMALE" ? <p className="text-sm text-muted-foreground">Este formulario registra servicios y gestaciones de hembras. Los machos conservan sus datos reproductivos en la ficha general.</p> : null}
      <div className="space-y-3">
        <h3 className="font-semibold">Historial reproductivo</h3>
        {records.length === 0 ? <p className="text-sm text-muted-foreground">Sin registros reproductivos todavía.</p> : records.map(record =>
          <div key={record.id} className="rounded-xl border p-3 text-sm">
            <div className="flex flex-wrap justify-between gap-2"><strong>{REPRODUCTION_LABELS[record.details.kind]}</strong><span>{record.dateIso.slice(0, 10)}</span></div>
            {record.details.result ? <p>Diagnóstico: {record.details.result === "POSITIVE" ? "Positivo" : record.details.result === "NEGATIVE" ? "Negativo" : "Inconcluso"}</p> : null}
            {record.details.method ? <p>Método: {record.details.method === "NATURAL" ? "Monta natural" : "Inseminación"}</p> : null}
            {record.details.sireCode ? <p>Reproductor: {record.details.sireCode}</p> : null}
            {record.details.calfCode ? <p>Cría: {record.details.calfCode}</p> : null}
            {record.details.nextCheckAt ? <p>Control: {record.details.nextCheckAt}</p> : null}
            {record.details.expectedCalvingAt ? <p>Parto estimado: {record.details.expectedCalvingAt}</p> : null}
            {record.note ? <p>{record.note}</p> : null}
            {record.actorName ? <p className="text-muted-foreground">Registrado por {record.actorName}</p> : null}
          </div>
        )}
      </div>
    </CardContent>
  </Card>;
}
