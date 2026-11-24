import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { canManage, ROLE_LABEL, type WsRole } from "@/lib/db";
import type { Member } from "@/hooks/use-workspace";
import { Button } from "@/components/ui/button";
import { Confirm } from "./Confirm";
export function Team({ wsId, inviteCode, members, myRole, myId, online }: { wsId: string; inviteCode: string; members: Member[]; myRole: WsRole | undefined; myId: string; online: { user_id: string }[] }) {
  const qc = useQueryClient(); const mgr = canManage(myRole);
  const refresh = () => qc.invalidateQueries({ queryKey: ["ws", wsId, "members"] });
  async function setRole(uid: string, role: WsRole) { const { error } = await supabase.from("workspace_members").update({ role }).eq("workspace_id", wsId).eq("user_id", uid); if (error) toast.error(error.message); else { toast.success("Role updated"); refresh(); } }
  async function remove(uid: string) { const { error } = await supabase.from("workspace_members").delete().eq("workspace_id", wsId).eq("user_id", uid); if (error) toast.error(error.message); else { toast.success(uid === myId ? "You left the workspace" : "Member removed"); refresh(); } }
  const link = typeof window !== "undefined" ? `${window.location.origin}/workspaces` : "";
  return <div className="space-y-4">
    <div className="rounded-md border border-primary/50 p-3"><div className="text-xs text-muted-foreground">Invite teammates — share this code. They join as Analyst.</div>
      <div className="mt-1 flex items-center gap-2"><code className="min-w-0 break-all font-mono text-sm text-primary">{inviteCode}</code>
        <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(`Join my Threat Detector workspace at ${link} with invite code ${inviteCode}`); toast.success("Invite copied"); }}>Copy invite</Button></div></div>
    <ul className="divide-y divide-border">{members.map((m) => { const on = online.some((o) => o.user_id === m.user_id);
      return <li key={m.user_id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
        <span className={`h-2 w-2 rounded-full ${on ? "bg-tier-low" : "bg-muted"}`} aria-label={on ? "online" : "offline"} />
        <span className="flex-1">{m.display_name}{m.user_id === myId && <span className="text-muted-foreground"> (you)</span>}<span className="block text-xs text-muted-foreground">{m.email}</span></span>
        {mgr && m.role !== "owner" && m.user_id !== myId ? <select value={m.role} onChange={(e) => setRole(m.user_id, e.target.value as WsRole)} className="rounded border border-input bg-background px-2 py-1 text-xs" aria-label={`Role for ${m.display_name}`}>
          {(["admin", "analyst", "viewer"] as WsRole[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select> : <span className="rounded border border-border px-2 py-0.5 font-mono text-xs">{ROLE_LABEL[m.role]}</span>}
        {m.role !== "owner" && (mgr || m.user_id === myId) && <Confirm title={m.user_id === myId ? "Leave workspace?" : `Remove ${m.display_name}?`} description={m.user_id === myId ? "You will lose access to this workspace." : "They will lose access and cannot rejoin using the shared invite code."} onConfirm={() => remove(m.user_id)}><Button size="sm" variant="ghost" className="text-destructive">{m.user_id === myId ? "Leave" : "Remove"}</Button></Confirm>}
      </li>; })}</ul>
    <p className="text-[11px] text-muted-foreground">Owner & Admin manage members · Analysts edit assets · Viewers read only.</p>
  </div>;
}
