import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Panel, field, L } from "@/components/tg/ui";
import { ROLE_LABEL } from "@/lib/db";
import { useAuthUser } from "@/hooks/use-workspace";
import { useSignOut } from "@/components/tg/SignOut";

export const Route = createFileRoute("/_authenticated/workspaces")({
  head: () => ({ meta: [{ title: "My workspaces — Threat Detector" }, { name: "description", content: "Create or join Threat Detector team workspaces." }, { property: "og:title", content: "My workspaces — Threat Detector" }, { property: "og:description", content: "Team workspaces for lab risk scoring." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Workspaces,
});

function Workspaces() {
  const me = useAuthUser(); const signOut = useSignOut(); const navigate = useNavigate(); const qc = useQueryClient();
  const list = useQuery({ queryKey: ["my-ws"], queryFn: async () => {
    const { data, error } = await supabase.from("workspace_members").select("role, workspaces(id, name, created_at)").eq("user_id", me.data!.id);
    if (error) throw error; return (data ?? []).filter((r) => r.workspaces);
  }, enabled: !!me.data });
  const [name, setName] = useState("CST3540 Network Security"); const [code, setCode] = useState(""); const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    const { data, error } = await supabase.rpc("create_workspace", { _name: name }); setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success("Workspace created with 15 demo lab assets"); qc.invalidateQueries({ queryKey: ["my-ws"] }); navigate({ to: "/w/$id", params: { id: data } });
  }
  async function join(e: React.FormEvent) {
    e.preventDefault(); if (code.trim().length < 4) return void toast.error("Enter an invite code"); setBusy(true);
    const { data, error } = await supabase.rpc("join_workspace", { _code: code }); setBusy(false);
    if (error) return void toast.error(error.message.includes("Invalid") ? "That invite code doesn't match a workspace" : error.message);
    toast.success("Joined workspace as Analyst"); navigate({ to: "/w/$id", params: { id: data } });
  }

  return <div className="min-h-screen grid-bg font-sans">
    <header className="flex items-center justify-between border-b border-border bg-background/90 px-6 py-4">
      <Link to="/" className="font-mono text-xl font-semibold text-primary">Threat Detector_</Link>
      <div className="flex items-center gap-3 text-sm"><span className="text-muted-foreground">{me.data?.name}</span><Button size="sm" variant="outline" onClick={signOut}>Sign out</Button></div>
    </header>
    <main className="mx-auto grid max-w-5xl gap-6 p-6 md:grid-cols-[1fr_320px]">
      <Panel title="my team workspaces">
        {list.isLoading ? <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</div>
          : list.data?.length ? <ul className="space-y-2">{list.data.map((r) => <li key={r.workspaces!.id}>
            <Link to="/w/$id" params={{ id: r.workspaces!.id }} className="flex items-center justify-between rounded-md border border-border p-4 transition-colors hover:border-primary">
              <span className="font-medium">{r.workspaces!.name}</span><span className="rounded border border-border px-2 py-0.5 font-mono text-xs text-muted-foreground">{ROLE_LABEL[r.role]}</span></Link></li>)}</ul>
          : <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No workspaces yet. Create one for your module or join with an invite code from a teammate.</div>}
      </Panel>
      <div className="space-y-6">
        <Panel title="create workspace"><form onSubmit={create} className="space-y-3"><L t="Module / team name"><input className={field} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></L><Button type="submit" className="w-full" disabled={busy}>Create</Button><p className="text-xs text-muted-foreground">Starts with the 15 demo campus lab assets and labelled simulated history.</p></form></Panel>
        <Panel title="join with invite code"><form onSubmit={join} className="space-y-3"><L t="Invite code"><input className={`${field} font-mono uppercase`} value={code} onChange={(e) => setCode(e.target.value)} placeholder="Paste the 32-character code" maxLength={40} /></L><Button type="submit" variant="outline" className="w-full" disabled={busy}>Join</Button></form></Panel>
      </div>
    </main>
  </div>;
}
