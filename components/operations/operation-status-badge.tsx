import { Badge } from "@/components/ui/badge";

const statusStyles: Record<string, string> = {
  DRAFT: "border-slate-200 bg-slate-100 text-slate-700",
  SHEETS_READY: "border-sky-200 bg-sky-50 text-sky-700",
  RESULTS_CAPTURED: "border-amber-200 bg-amber-50 text-amber-700",
  APPLIED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CANCELLED: "border-rose-200 bg-rose-50 text-rose-700",
};

const statusLabels: Record<string, string> = {
  DRAFT: "Borrador",
  SHEETS_READY: "Planillas listas",
  RESULTS_CAPTURED: "Resultados cargados",
  APPLIED: "Aplicado",
  CANCELLED: "Cancelado",
};

export function OperationStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={statusStyles[status] ?? statusStyles.DRAFT}>
      {statusLabels[status] ?? status.replaceAll("_", " ")}
    </Badge>
  );
}
