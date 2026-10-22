import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Beef, BrainCircuit, ClipboardList, FileSpreadsheet, LandPlot, Landmark, Plus, Sprout } from "lucide-react";
import { isBusinessVerificationRequired } from "@/lib/config/business-verification";
import { getCurrentTenant, getCurrentTenantVerification } from "@/lib/auth/session";
import { getDashboardSnapshot } from "@/server/queries/dashboard-query";
import { allowedFarmIds } from "@/lib/permissions/farm-access";
import { prisma } from "@/lib/db/prisma";
import { VerificationGate } from "@/components/dashboard/verification-gate";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const context = await getCurrentTenant();
  if (!context) redirect("/onboarding");
  const permittedIds = await allowedFarmIds(context.tenant.id,context.user.id,context.membership.role);
  const [snapshot, verification, farmShortcuts] = await Promise.all([
    getDashboardSnapshot(context.tenant.id,permittedIds),
    getCurrentTenantVerification(),
    prisma.farm.findMany({
      where: { tenantId: context.tenant.id, ...(permittedIds ? {id:{in:permittedIds}} : {}) },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 30,
    }),
  ]);
  const role = context.membership.role;
  const canManageFarms = ["TENANT_OWNER", "TENANT_ADMIN", "FARM_MANAGER"].includes(role);
  const canImport = canManageFarms;
  const canOperate = ["TENANT_OWNER", "TENANT_ADMIN", "FARM_MANAGER", "OPERATOR"].includes(role);
  const farmReadable = role !== "ACCOUNTING";
  const firstName = (context.user.name || "").trim().split(/\s+/)[0] || "bienvenido";
  const cards = [
    ...(farmReadable ? [{ title: "Fincas", amount: snapshot.farmsCount, hint: "Registradas", href: "/farms?new=1", Icon: LandPlot }] : []),
    ...(farmReadable ? [{ title: "Ganado", amount: snapshot.animalsCount, hint: "Animales registrados", href: "/livestock", Icon: Beef }] : []),
    ...(farmReadable ? [{ title: "Jornadas", amount: snapshot.operationsCount, hint: "Jornadas de campo", href: "/operations", Icon: ClipboardList }] : []),
    ...(farmReadable ? [{ title: "Publicaciones", amount: snapshot.listingsCount, hint: "Registros comerciales", href: null, Icon: Sprout }] : []),
  ];
  const actions = [
    ...(canManageFarms ? [{ label: "Gestionar fincas", detail: "Crear y actualizar los datos de tus fincas", href: "/farms", Icon: LandPlot }] : []),
    ...(canOperate ? [{ label: "Registrar ganado", detail: "Organizar el inventario e historial animal", href: "/livestock", Icon: Beef }] : []),
    ...(canOperate ? [{ label: "Crear jornada", detail: "Planificar operaciones de campo", href: "/operations", Icon: ClipboardList }] : []),
    ...(canImport ? [{ label: "Importar Excel", detail: "Revisar archivos de inventario", href: "/imports", Icon: FileSpreadsheet }] : []),
  ];
  return (
    <div className="space-y-5 sm:space-y-8">
      <section className="relative overflow-hidden rounded-[23px] bg-[linear-gradient(120deg,#17291f,#2b4934)] p-5 text-white shadow-[0_16px_45px_rgba(25,46,31,0.15)] sm:p-8">
        <div aria-hidden={true} className="pointer-events-none absolute -right-16 -top-24 size-40 rounded-full border border-white/10 bg-white/[0.035]" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d5b374]">Tu centro de operaciones</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Hola, {firstName}.</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/75 sm:text-base">Todo lo importante de tu empresa en un solo lugar. Consulta tus indicadores y continúa tus tareas de campo.</p>
          <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white/90">
            <span className="size-2 shrink-0 rounded-full bg-[#d5b374]" />
            <span className="truncate">{context.tenant.name}</span>
          </div>
        </div>
      </section>

      {isBusinessVerificationRequired() && verification ? <VerificationGate status={verification.status} /> : null}

      <section className="space-y-4" aria-labelledby="ganadia-summary-title">
        <div className="flex items-center justify-between gap-3">
          <h2 id="ganadia-summary-title" className="text-xl font-bold tracking-tight text-[#1d3025] sm:text-2xl">Resumen general</h2>
          <span className="text-xs font-medium text-[#77827a]">Datos de tu empresa</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {cards.map(({ title, amount, hint, href, Icon }) => {
            const body = <><div className="flex items-start justify-between gap-2"><span className="flex size-9 items-center justify-center rounded-xl bg-[#f1ebdf] text-[#90703c]"><Icon className="size-5" aria-hidden={true}/></span>{href ? <ArrowRight className="size-4 text-[#9ca69e]" aria-hidden={true}/> : <span className="text-[10px] text-[#86928a]">Informativo</span>}</div><p className="mt-3 text-2xl font-extrabold tabular-nums tracking-tight text-[#1d3025] sm:text-3xl">{amount}</p><h3 className="mt-1 text-sm font-semibold text-[#26372b]">{title}</h3><p className="mt-1 text-xs leading-5 text-[#77827a]">{hint}</p></>;
            return href ? <Link key={title} href={href} className="min-w-0 rounded-[22px] border border-[#e5e9e3] bg-white p-3 shadow-sm transition-all hover:border-[#baa16d] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9b773f] sm:p-5">{body}</Link> : <article key={title} className="min-w-0 rounded-[22px] border border-[#e5e9e3] bg-white p-4 shadow-sm sm:p-5">{body}</article>;
          })}
        </div>
      </section>

      {(canOperate || role==="ACCOUNTING") && farmShortcuts.length > 0 && (
        <section className="space-y-4" aria-labelledby="ganadia-farm-tools-title">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#997943]">Administración por finca</p>
            <h2 id="ganadia-farm-tools-title" className="mt-1 text-xl font-bold tracking-tight text-[#1d3025] sm:text-2xl">ERP y asesor técnico</h2>
            <p className="mt-1 text-sm leading-6 text-[#6d7b70]">Accede directamente a los módulos de cada finca, sin mezclar sus registros.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {farmShortcuts.map((farm) => (
              <article key={farm.id} className="min-w-0 rounded-[22px] border border-[#e5e9e3] bg-white p-4 shadow-sm sm:p-5">
                <h3 className="mb-3 break-words text-base font-bold text-[#233a2b]">{farm.name}</h3>
                <div className="grid gap-2">
                  <Link href={`/farms/${encodeURIComponent(farm.id)}/erp`} className="flex min-h-12 items-center gap-3 rounded-xl bg-[#234a34] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#1b3728] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9b773f]">
                    <Landmark className="size-5 shrink-0" aria-hidden={true}/>
                    <span className="min-w-0 flex-1">ERP administrativo</span>
                    <ArrowRight className="size-4 shrink-0" aria-hidden={true}/>
                  </Link>
                  {role!=="ACCOUNTING" && <Link href={`/farms/${encodeURIComponent(farm.id)}/geografia/asesor` className="flex min-h-12 items-center gap-3 rounded-xl border border-[#d9e3d7] bg-[#f3f7f1] px-4 text-sm font-semibold text-[#284432] transition-colors hover:bg-[#e6efe2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9b773f]">
                    <BrainCircuit className="size-5 shrink-0" aria-hidden={true}/>
                    <span className="min-w-0 flex-1">Asesor de fundaciones y pastoreo</span>
                    <ArrowRight className="size-4 shrink-0" aria-hidden={true}/>
                  </Link>}
                </div>
              </article>
            ))}
          </div>
          <p className="text-xs leading-5 text-[#6d7b70]">El asesor disponible realiza estudios técnicos de pastoreo; todavía no es un chat generativo conectado a OpenAI.</p>
        </section>
      )}

      <section className="space-y-4" aria-labelledby="ganadia-actions-title">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#997943]">Acceso rápido</p><h2 id="ganadia-actions-title" className="mt-1 text-xl font-bold tracking-tight text-[#1d3025] sm:text-2xl">¿Qué deseas hacer hoy?</h2></div>
          <p className="text-xs text-[#77827a]">Funciones disponibles para tu rol</p>
        </div>
        {actions.length > 0 ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {actions.map(({ label, detail, href, Icon }) => <Link key={href} href={href} className="group flex min-h-24 flex-col rounded-[22px] border border-[#e5e9e3] bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#baa16d] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9b773f]">
            <div className="flex items-center justify-between gap-3"><span className="flex size-11 items-center justify-center rounded-2xl bg-[#f1ebdf] text-[#90703c]"><Icon className="size-5" aria-hidden={true}/></span><Plus className="size-5 text-[#927445] transition-transform group-hover:rotate-90" aria-hidden={true}/></div>
            <h3 className="mt-3 text-sm font-bold text-[#1d3025]">{label}</h3><p className="mt-1 text-xs leading-5 text-[#77827a]">{detail}</p>
          </Link>)}
        </div> : <p className="rounded-2xl border border-[#e5e9e3] bg-white p-6 text-sm text-[#77827a]">Puedes consultar los módulos habilitados desde la navegación.</p>}
      </section>
      <div className="rounded-[22px] border border-[#e5e9e3] bg-white p-5 sm:p-6"><p className="text-sm font-bold text-[#26372b]">GanadIA · Gestión inteligente</p><p className="mt-2 text-sm leading-6 text-[#77827a]">Los cambios realizados en fincas, animales y jornadas se guardan en sus módulos. Este panel solo presenta información de la empresa activa.</p></div>
    </div>
  );
}
