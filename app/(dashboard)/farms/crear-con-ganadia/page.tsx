import {requireRole} from "@/lib/auth/session";
import {CreaTuFinca} from "@/components/farms/crea-tu-finca";
export const dynamic="force-dynamic";
export default async function CrearConGanadia(){const {tenantContext}=await requireRole({tenant:["TENANT_OWNER","TENANT_ADMIN"]});if(!tenantContext)return null;return <CreaTuFinca name={(tenantContext.user.name||"").trim().split(/\s+/)[0]||"ganadero"}/>;}
