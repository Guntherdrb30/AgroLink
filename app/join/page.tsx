import { JoinInvite } from "@/components/team/join-invite";
export const dynamic="force-dynamic";
export default async function JoinPage({searchParams}:{searchParams:Promise<{token?:string}>}) {
 const {token}=await searchParams;
 return <JoinInvite token={typeof token==="string"?token:""}/>;
}