import {getCurrentTenant} from "@/lib/auth/session";
import {redirect} from "next/navigation";
import {GanadiaMemoryPanel} from "@/components/ai/ganadia-memory-panel";
export const dynamic="force-dynamic";
export default async function MemoriaPage(){
 const ctx=await getCurrentTenant();if(!ctx)redirect("/login");
 return <GanadiaMemoryPanel/>;
}
