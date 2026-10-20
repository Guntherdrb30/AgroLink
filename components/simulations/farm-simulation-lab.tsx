"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, Calculator, CircleHelp, Download, RotateCcw, TrendingDown, TrendingUp } from "lucide-react";
import {
  calculateStressScenarios,
  demonstrationInputs,
  estimateRiskBySampling,
  type ProjectKind,
  type SimulationInputs,
} from "@/lib/simulations/investment-engine";

type Props = { farmId: string; farmName: string; currentAnimalCount: number };

const plans: { value: ProjectKind; label: string; description: string }[] = [
  { value: "bovine_fattening", label: "Ceba bovina", description: "Compra, alimentación y venta por peso vivo" },
  { value: "swine_fattening", label: "Engorde porcino", description: "Lotes de cerdos por cantidad, peso y alimentación" },
  { value: "swine_breeding", label: "Cría porcina", description: "Madres, camadas, supervivencia y venta de lechones" },
];

type NumericKey = Exclude<keyof SimulationInputs, "kind">;
type Field = { key: NumericKey; label: string; hint?: string; step?: string; max?: number };
const common: Field[] = [
  { key: "heads", label: "Cantidad de animales / madres", step: "1", max: 100000 },
  { key: "months", label: "Horizonte de evaluación (meses)", step: "1", max: 120 },
  { key: "infrastructureInvestment", label: "Inversión inicial en instalaciones (USD)", step: "10" },
  { key: "fixedCostMonthly", label: "Gasto fijo mensual (USD)", step: "10" },
  { key: "annualDiscountPercent", label: "Tasa anual de descuento (%)", step: "0.5", max: 100 },
];
const fattening: Field[] = [
  { key: "cycleMonths", label: "Duración del ciclo (meses)", step: "1", max: 120 },
  { key: "entryWeightKg", label: "Peso de entrada (kg)", step: "1" },
  { key: "exitWeightKg", label: "Peso de venta (kg)", step: "1" },
  { key: "purchasePerHead", label: "Costo de compra por animal (USD)", step: "1" },
  { key: "mortalityPercent", label: "Mortalidad estimada (%)", step: "0.5", max: 100 },
  { key: "feedConversionRatio", label: "Kg de alimento por kg de ganancia", step: "0.1", hint: "Modelo simplificado; en pastoreo bovino requiere calibración local." },
  { key: "feedPricePerKg", label: "Costo por kg de alimento (USD)", step: "0.01" },
  { key: "salePricePerKg", label: "Precio de venta por kg vivo (USD)", step: "0.01" },
  { key: "otherCostPerHead", label: "Otros costos por animal y ciclo (USD)", step: "1" },
];
const breeding: Field[] = [
  { key: "purchasePerHead", label: "Inversión inicial por madre (USD)", step: "5" },
  { key: "littersPerSowYear", label: "Partos estimados por madre y año", step: "0.1", max: 5 },
  { key: "pigletsBornPerLitter", label: "Lechones nacidos vivos por parto", step: "0.1", max: 30 },
  { key: "pigletSurvivalPercent", label: "Supervivencia hasta venta (%)", step: "0.5", max: 100 },
  { key: "pigletSalePrice", label: "Precio de venta por lechón (USD)", step: "1" },
  { key: "sowMonthlyCost", label: "Mantenimiento por madre al mes (USD)", step: "1" },
  { key: "pigletCostPerHead", label: "Costo adicional por lechón (USD)", step: "1" },
];
const currency = new Intl.NumberFormat("es-VE", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("es-VE", { maximumFractionDigits: 1 });

export function FarmSimulationLab({ farmId, farmName, currentAnimalCount }: Props) {
  const [input, setInput] = useState<SimulationInputs>({ ...demonstrationInputs.bovine_fattening });
  const analysis = useMemo(() => {
    try {
      const cases = calculateStressScenarios(input);
      const risk = estimateRiskBySampling(input);
      return { cases, risk, error: null as string | null };
    } catch (error) {
      return { cases: [], risk: null, error: error instanceof Error ? error.message : "Datos inválidos" };
    }
  }, [input]);
  const base = analysis.cases.find(c => c.name === "base")?.result;
  const maxMagnitude = Math.max(1, ...analysis.cases.map(c => Math.abs(c.result.netCash)));

  function selectKind(kind: ProjectKind) {
    setInput({ ...demonstrationInputs[kind] });
  }
  function exportCsv() {
    if (!base) return;
    const lines = [
      ["Campo", "Valor"],
      ["Finca", farmName],
      ["Proyecto", plans.find(p => p.value === input.kind)?.label ?? input.kind],
      ["Nota", "SIMULACIÓN HIPOTÉTICA, NO REGISTRO FINANCIERO"],
      ...([...common, ...(input.kind === "swine_breeding" ? breeding : fattening)].map(f =>
        [f.label, String(input[f.key])]) as string[][]),
      ["Ingreso esperado USD", String(base.revenue)],
      ["Costos variables USD", String(base.variableCosts)],
      ["Costos fijos USD", String(base.fixedCosts)],
      ["Inversión inicial USD", String(base.capitalInvestment)],
      ["Flujo neto USD", String(base.netCash)],
      ["Valor presente neto USD", String(base.presentValue)],
      ["Mes de recuperación", String(base.paybackMonth ?? "No recuperado")],
    ];
    const csv = "\uFEFF" + lines.map(parts => parts.map(value => '"' + value.replaceAll('"', '""') + '"').join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "ganadia-simulacion.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link href={`/farms/${encodeURIComponent(farmId)}`}
        className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#806034]">
        <ArrowLeft className="size-4" aria-hidden={true} /> Volver a {farmName}
      </Link>
      <section className="rounded-[26px] bg-[linear-gradient(115deg,#192f23,#365239)] p-5 text-white sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d5b67b]">GanadIA · Simulaciones</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Laboratorio de inversiones</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/80">
          Compara decisiones antes de invertir: ganado bovino, engorde de cochinos o cría de lechones.
          Todas las cifras son supuestos editables; no se guardan en la contabilidad.
        </p>
        <p className="mt-3 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs leading-5 text-white/85">
          Finca: <strong>{farmName}</strong> · Inventario registrado: {number.format(currentAnimalCount)} animales.
          Este simulador no sustituye un presupuesto, valoración ni diagnóstico veterinario.
        </p>
      </section>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.94fr)]">
        <section className="min-w-0 space-y-5 rounded-[24px] border border-[#e1e7df] bg-white p-4 shadow-sm sm:p-6">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-[#20382a]"><Calculator className="size-5 text-[#91703c]"/> Configurar inversión</h2>
            <p className="mt-1 text-xs leading-5 text-[#718076]">Ejemplos demostrativos. Reemplaza todos los importes por tus precios reales.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label="Tipo de inversión">
            {plans.map(p => (
              <button key={p.value} type="button" onClick={() => selectKind(p.value)}
                aria-pressed={input.kind === p.value}
                className={"rounded-2xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9c7d4b] " +
                  (input.kind === p.value ? "border-[#376145] bg-[#eaf1e8] text-[#203a2a]" : "border-[#e2e7de] bg-[#f9faf7] text-[#5f7063]")}>
                <span className="block text-sm font-bold">{p.label}</span>
                <span className="mt-1 block text-[11px] leading-4">{p.description}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
            {[...common, ...(input.kind === "swine_breeding" ? breeding : fattening)].map(f => (
              <label key={f.key} className="min-w-0 space-y-1.5">
                <span className="block text-xs font-semibold leading-5 text-[#38513f]">{f.label}</span>
                <input type="number" inputMode="decimal" min="0" max={f.max} step={f.step ?? "0.01"}
                  value={input[f.key]}
                  onChange={event => setInput(previous => ({ ...previous, [f.key]: Number(event.target.value) }))}
                  className="min-h-11 w-full rounded-xl border border-[#dce4da] bg-[#fcfdfa] px-3 text-base font-semibold tabular-nums text-[#253e2b] outline-none focus-visible:border-[#977440] focus-visible:ring-2 focus-visible:ring-[#977440]/20"/>
                {f.hint && <span className="block text-[11px] leading-4 text-[#78857a]">{f.hint}</span>}
              </label>
            ))}
          </div>
          <button type="button" onClick={() => selectKind(input.kind)}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#dfe6dc] px-4 text-xs font-bold text-[#6c795f] hover:bg-[#f5f3ed]">
            <RotateCcw className="size-4" aria-hidden={true}/> Restablecer ejemplo ilustrativo
          </button>
        </section>
        <section className="min-w-0 space-y-5" aria-live="polite">
          {analysis.error ? (
            <div role="alert" className="rounded-[24px] border border-amber-300 bg-amber-50 p-6 text-sm font-semibold text-amber-900">
              {analysis.error}. Revisa los supuestos del modelo.
            </div>
          ) : base ? <>
            <div className="rounded-[25px] border border-[#dce6db] bg-white p-5 shadow-sm sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.17em] text-[#97733b]">Escenario base · {input.months} meses</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#1c3826]">{currency.format(base.netCash)}</h2>
              <p className="mt-1 text-sm text-[#718075]">Flujo neto acumulado estimado, después de inversión inicial</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {[
                  ["Ingresos proyectados", currency.format(base.revenue)],
                  ["Costos variables", currency.format(base.variableCosts)],
                  ["Costos fijos", currency.format(base.fixedCosts)],
                  ["Inversión inicial", currency.format(base.capitalInvestment)],
                  ["VPN aproximado", currency.format(base.presentValue)],
                  ["Recuperación", base.paybackMonth ? `Mes ${base.paybackMonth}` : "No alcanzada"],
                ].map(([label,value]) => (
                  <div key={label} className="min-w-0 rounded-xl bg-[#f6f8f4] p-3">
                    <p className="text-[11px] leading-4 text-[#728276]">{label}</p>
                    <p className="mt-1 break-words text-base font-bold tabular-nums text-[#294330]">{value}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs leading-5 text-[#718075]">
                Punto de equilibrio: {base.breakEvenPrice === null ? "No calculable" : currency.format(base.breakEvenPrice)}
                {input.kind === "swine_breeding" ? " por lechón vendido" : " por kg vivo vendido"}.
              </p>
            </div>
            <div className="rounded-[25px] border border-[#dce6db] bg-white p-5 shadow-sm sm:p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold text-[#20382a]"><BarChart3 className="size-5 text-[#96723e]"/> Tres escenarios</h2>
              <p className="mt-2 text-xs leading-5 text-[#758277]">Cambios hipotéticos de precio, alimento y mortalidad/supervivencia, comparados con la misma inversión.</p>
              <div className="mt-5 space-y-4">
                {analysis.cases.map(s => (
                  <div key={s.name}>
                    <div className="mb-2 flex justify-between gap-2 text-xs font-bold">
                      <span className="capitalize text-[#4c6052]">{s.name}</span>
                      <span className={s.result.netCash >= 0 ? "text-[#2f7347]" : "text-[#b04339]"}>
                        {currency.format(s.result.netCash)}
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-[#e9ede6]">
                      <div className={"h-full rounded-full " + (s.result.netCash >= 0 ? "bg-[#4b8c5b]" : "bg-[#c86c62]")}
                        style={{ width: `${Math.max(2,Math.round(Math.abs(s.result.netCash) / maxMagnitude * 100))}%` }}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {analysis.risk && <div className="rounded-[25px] border border-[#dce6db] bg-white p-5 shadow-sm sm:p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold text-[#20382a]"><TrendingDown className="size-5 text-[#96723e]"/> Sensibilidad probabilística</h2>
              <p className="mt-2 text-xs leading-6 text-[#718075]">Se compararon {analysis.risk.iterations} variaciones aleatorias ilustrativas; no son probabilidades calibradas con datos históricos.</p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  ["P10", analysis.risk.p10],
                  ["Mediana", analysis.risk.median],
                  ["P90", analysis.risk.p90],
                ].map(([label,value]) => <div key={label} className="min-w-0 rounded-xl bg-[#f6f8f4] p-3">
                  <p className="text-[11px] text-[#758277]">{label}</p>
                  <p className="mt-1 break-words text-xs font-bold tabular-nums text-[#294330] sm:text-sm">{currency.format(Number(value))}</p>
                </div>)}
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs leading-5 text-[#627568]"><TrendingUp className="size-4 shrink-0"/>
                {number.format(analysis.risk.shareWithPositiveCash)} % de los ensayos dieron un flujo neto positivo, únicamente bajo estas hipótesis.
              </div>
            </div>}
            <button type="button" onClick={exportCsv}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#795c31] px-5 text-sm font-bold text-white hover:bg-[#634b2b]">
              <Download className="size-4"/> Exportar este escenario CSV
            </button>
          </> : null}
          <div className="flex gap-3 rounded-[20px] border border-[#dfe6db] bg-[#f6f8f3] p-4 text-xs leading-6 text-[#667869]">
            <CircleHelp className="mt-1 size-5 shrink-0 text-[#8f713e]" aria-hidden={true}/>
            <p>Herramienta experimental de planificación. No incluye impuestos, inflación, financiamiento, depreciación, valores residuales ni costos de oportunidad biológicos completos. Los precios son demostrativos; no se consultan mercados reales. El cálculo no modifica fincas, inventarios ni contabilidad.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
