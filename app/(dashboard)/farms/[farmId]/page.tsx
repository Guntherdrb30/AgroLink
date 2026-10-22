import { allowedFarmIds } from "@/lib/permissions/farm-access";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Beef, CalendarDays, ClipboardList, FileText, Landmark, MapPin, MapPinned, Calculator, Package, Pencil, ShieldCheck, Stamp, TrendingUp, Users, Wallet } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { findFarmById } from "@/server/repositories/farm-repository";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ farmId: string }> };
const modules = [
  { label: "Documentos", Icon: FileText, desc: "RIF, titularidad, permisos y vencimientos" },
  { label: "Hierros", Icon: Stamp, desc: "Marcas ganaderas y soportes de registro" },
  { label: "Reportes", Icon: TrendingUp, desc: "Resultado operativo y comparativos" },
];
export default async function FarmCenterPage({ params }: Props) {
  const { farmId } = await params;
  const { tenantContext } = await requireRole({
    tenant: ["TENANT_OWNER", "TENANT_ADMIN", "FARM_MANAGER", "OPERATOR"],
  });
  if (!tenantContext) notFound();
  const allowed=await allowedFarmIds(tenantContext.tenant.id,tenantContext.user.id,tenantContext.membership.role);if(allowed&&!allowed.includes(farmId))notFound();
  const farm = await findFarmById(farmId);
  if (!farm || farm.tenantId !== tenantContext.tenant.id) notFound();
  const [animals, operations, drafts, applied, needsReview] = await Promise.all([
    prisma.animal.count({ where: { tenantId: tenantContext.tenant.id, farmId } }),
    prisma.livestockOperation.count({ where: { tenantId: tenantContext.tenant.id, farmId } }),
    prisma.livestockOperation.count({ where: { tenantId: tenantContext.tenant.id, farmId, status: { in: ["DRAFT", "SHEETS_READY"] } } }),
    prisma.livestockOperation.count({ where: { tenantId: tenantContext.tenant.id, farmId, status: "APPLIED" } }),
    prisma.livestockOperation.count({ where: { tenantId: tenantContext.tenant.id, farmId, status: "RESULTS_CAPTURED" } }),
  ]);
  const canEdit = ["TENANT_OWNER", "TENANT_ADMIN", "FARM_MANAGER"].includes(tenantContext.membership.role);
  const tiles = [
    { name: "Ganado", value: String(animals), detail: "Animales registrados", Icon: Beef },
    { name: "Jornadas", value: String(operations), detail: "Registradas en esta finca", Icon: ClipboardList },
    { name: "Programadas", value: String(drafts), detail: "En planificación", Icon: CalendarDays },
    { name: "Por revisar", value: String(needsReview), detail: "Con resultados capturados", Icon: ShieldCheck },
  ];
  return <div className="space-y-6 sm:space-y-8">
    <Link href="/farms" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#816135]"><ArrowLeft className="size-4"/> Mis fincas</Link>
    <section className="rounded-[26px] bg-[linear-gradient(125deg,#192e22,#344e35)] p-5 text-white shadow-lg sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.19em] text-[#dcc48d]">Centro de administración de finca</p>
      <h1 className="mt-3 break-words text-3xl font-bold tracking-tight sm:text-4xl">{farm.name}</h1>
      <p className="mt-2 flex items-center gap-2 text-sm text-white/75"><MapPin className="size-4"/>{farm.location || "Ubicación por registrar"}</p>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-white/75">{farm.description || "Organiza los trabajos, el inventario ganadero y los datos de esta finca."}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {farm.hectares && <span className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold">{Number(farm.hectares).toLocaleString("es-VE")} hectáreas</span>}
        <span className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold">{applied} jornadas aplicadas</span>
      </div>
      {canEdit && <Link href={`/farms/${encodeURIComponent(farmId)}/edit`} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#b9975a] px-5 text-sm font-bold text-[#15251b] hover:bg-[#e0bb79]"><Pencil className="size-4"/> Editar ficha de finca</Link>}
    </section>
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-[#1f3827]">Situación operativa</h2>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{tiles.map(({name,value,detail,Icon})=>
        <article key={name} className="min-w-0 rounded-[20px] border border-[#e4e8e0] bg-white p-4 shadow-sm">
          <span className="inline-flex size-9 items-center justify-center rounded-xl bg-[#f2eadc] text-[#84673a]"><Icon className="size-5"/></span>
          <p className="mt-3 text-3xl font-extrabold tabular-nums text-[#1c3825]">{value}</p>
          <h3 className="mt-1 text-sm font-bold text-[#20372a]">{name}</h3>
          <p className="mt-1 text-xs leading-5 text-[#77857a]">{detail}</p>
        </article>)}</div>
    </section>
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-[#1f3827]">Gestión de la finca</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/livestock" className="flex min-h-24 items-center gap-4 rounded-[20px] border border-[#dfe6dc] bg-white p-4 shadow-sm"><Beef className="size-7 shrink-0 text-[#84673a]"/><div className="flex-1"><h3 className="font-bold">Ganado</h3><p className="text-xs leading-5 text-[#738074]">Inventario, historial y reproducción</p></div><ArrowRight className="size-4 text-[#84673a]"/></Link>
        <Link href="/operations" className="flex min-h-24 items-center gap-4 rounded-[20px] border border-[#dfe6dc] bg-white p-4 shadow-sm"><ClipboardList className="size-7 shrink-0 text-[#84673a]"/><div className="flex-1"><h3 className="font-bold">Jornadas</h3><p className="text-xs leading-5 text-[#738074]">Trabajos y resultados de campo</p></div><ArrowRight className="size-4 text-[#84673a]"/></Link>

        <Link href={`/farms/${encodeURIComponent(farmId)}/geografia`} className="flex min-h-24 items-center gap-4 rounded-[20px] border border-[#dfe6dc] bg-white p-4 shadow-sm transition-colors hover:border-[#bba274]">
          <MapPinned className="size-7 shrink-0 text-[#84673a]"/><div className="min-w-0 flex-1"><h3 className="font-bold">Mapa y GPS</h3><p className="text-xs leading-5 text-[#738074]">Ubicación de finca y visor geográfico</p></div><ArrowRight className="size-4 text-[#84673a]"/>
        </Link>
        <Link href={`/farms/${encodeURIComponent(farmId)}/simulaciones`} className="flex min-h-24 items-center gap-4 rounded-[20px] border border-[#dfe6dc] bg-white p-4 shadow-sm transition-colors hover:border-[#bba274]">
          <Calculator className="size-7 shrink-0 text-[#84673a]"/><div className="min-w-0 flex-1"><h3 className="font-bold">Simulador de inversiones</h3><p className="text-xs leading-5 text-[#738074]">Comparar escenarios bovinos y porcinos</p></div><ArrowRight className="size-4 text-[#84673a]"/>
        </Link>
        <Link href={`/farms/${encodeURIComponent(farmId)}/movimientos`} className="flex min-h-24 items-center gap-4 rounded-[20px] border border-[#dfe6dc] bg-white p-4 shadow-sm transition-colors hover:border-[#bba274]"><MapPinned className="size-7 shrink-0 text-[#84673a]"/><div className="flex-1"><h3 className="font-bold">Fundaciones y rotación</h3><p className="text-xs leading-5 text-[#738074]">Trasladar ganado, rastrear origen y destino</p></div><ArrowRight className="size-4 text-[#84673a]"/></Link>
        <Link href={`/farms/${encodeURIComponent(farmId)}/erp`} className="flex min-h-24 items-center gap-4 rounded-[20px] border border-[#dfe6dc] bg-white p-4 shadow-sm"><Landmark className="size-7 shrink-0 text-[#84673a]"/><div className="min-w-0 flex-1"><h3 className="font-bold">ERP Administrativo</h3><p className="text-xs leading-5 text-[#738074]">Proveedores, compras, inventario, activos, finanzas y personal</p></div><ArrowRight className="size-4 text-[#84673a]"/></Link>
        {modules.map(({label,Icon,desc})=><article key={label} className="flex min-h-24 items-center gap-4 rounded-[20px] border border-[#e3e7e0] bg-white p-4 opacity-80"><Icon className="size-7 shrink-0 text-[#84673a]"/><div className="min-w-0 flex-1"><h3 className="font-bold text-[#20372a]">{label}</h3><p className="text-xs leading-5 text-[#738074]">{desc}</p></div><span className="shrink-0 rounded-full bg-[#f1f1ec] px-2 py-1 text-[10px] font-semibold text-[#707b70]">En preparación</span></article>)}
      </div>
    </section>
    <div className="flex items-start gap-3 rounded-2xl border border-[#e3e7de] bg-white p-4 text-sm leading-6 text-[#6c7a70]"><Wallet className="mt-0.5 size-5 shrink-0 text-[#92713c]"/><p>Los indicadores financieros aparecerán cuando registremos ingresos, gastos y cuentas de esta finca. No mostramos utilidad ficticia ni saldos sin datos contables.</p></div>
  </div>;
}
