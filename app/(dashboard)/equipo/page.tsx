import { notFound } from "next/navigation";
import { getCurrentTenant } from "@/lib/auth/session";
import { TeamManager } from "@/components/team/team-manager";
export const dynamic="force-dynamic";
export default async function TeamPage(){
 const c=await getCurrentTenant();if(!c||!["TENANT_OWNER","TENANT_ADMIN"].includes(c.membership.role))notFound();
 return <div className="mx-auto max-w-4xl space-y-4"><header><p className="text-xs font-bold uppercase tracking-widest text-[#937346]">Seguridad y administración</p><h1 className="mt-2 text-3xl font-bold">Mi equipo y accesos</h1><p className="mt-2 text-sm text-[#718074]">Gestiona a qué finca accede cada miembro. La titularidad permanece en manos del propietario.</p></header><TeamManager canInviteAdmins={c.membership.role==="TENANT_OWNER"}/></div>;
}