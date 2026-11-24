import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CyberBackdrop } from "@/components/three/CyberBackdrop";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { CONTROL_INFO, DEFAULT_MODEL, EXPOSURES, cvssScore, labStats, likelihood, residualScore, riskScore, riskTier, TIERS, type Control, type MitigationModel, type Tier } from "@/lib/scoring";
import { activityQuery, assetsQuery, membersQuery, snapshotsQuery, useAssetMutations, useAuthUser, useWorkspaceRealtime, wsQuery } from "@/hooks/use-workspace";
import { canEdit, ROLE_LABEL } from "@/lib/db";
import { assetsCsv, download } from "@/lib/csv";
import { Panel, Stat, L, TIER_CLS, TIER_VAR, field } from "@/components/tg/ui";
import { CvssPanel } from "@/components/tg/CvssPanel";
import { Heatmap } from "@/components/tg/Heatmap";
import { AttackFlow } from "@/components/tg/AttackFlow";
import { Simulator, chartTip } from "@/components/tg/Simulator";
import { AnalystPanel } from "@/components/tg/AnalystPanel";
import { Trends } from "@/components/tg/Trends";
import { Activity } from "@/components/tg/Activity";
import { Team } from "@/components/tg/Team";
import { Files } from "@/components/tg/Files";
import { Tour } from "@/components/tg/Tour";
import { Confirm } from "@/components/tg/Confirm";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Tooltip as Tip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export const Route = createFileRoute("/_authenticated/w/$id")({
  head: () => ({ meta: [{ title: "Workspace — Threat Detector" }, { name: "description", content: "Threat Detector team workspace for lab risk scoring." }, { property: "og:title", content: "Threat Detector Workspace" }, { property: "og:description", content: "Live lab vulnerability exposure workspace." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Workspace,
  errorComponent: ({ error }) => <div className="grid min-h-screen place-items-center p-6 text-center"><div><p className="font-mono text-tier-critical">{(error as Error).message}</p><Link to="/workspaces" className="mt-4 inline-block text-sm text-primary">← Back to workspaces</Link></div></div>,
});

const TABS = ["Impact", "Heatmap", "Attack paths", "What-if", "AI analyst", "Trends", "Files", "Team", "Activity"] as const;
type TabT = (typeof TABS)[number];

function Workspace() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const me = useAuthUser();
  const ws = useQuery(wsQuery(id));
  const assetsQ = useQuery(assetsQuery(id));
  const members = useQuery(membersQuery(id));
  const snaps = useQuery(snapshotsQuery(id));
  const activity = useQuery(activityQuery(id));
  const online = useWorkspaceRealtime(id, { id: me.data?.id ?? "anon", name: me.data?.name ?? "" });
  const mut = useAssetMutations(id);
  const assets = assetsQ.data ?? [];
  const myRole = members.data?.find((m) => m.user_id === me.data?.id)?.role;
  const editable = canEdit(myRole);

  const [selected, setSelected] = useState<string>("");
  const [tab, setTab] = useState<TabT>("Impact");
  const [cell, setCell] = useState<[number, number] | null>(null);
  const [q, setQ] = useState(""); const [tierF, setTierF] = useState<Tier | "">("");
  const [tour, setTour] = useState(false); const [cmd, setCmd] = useState(false);
  const [sim, setSimState] = useState<Record<string, Control[]>>({});
  const [model, setModel] = useState<MitigationModel>(DEFAULT_MODEL);

  useEffect(() => { if (!selected && assets[0]) setSelected(assets[0].id); }, [assets, selected]);
  useEffect(() => { if (!localStorage.getItem("tg-toured-v2")) { setTour(true); localStorage.setItem("tg-toured-v2", "1"); } }, []);

  const cur = assets.find((a) => a.id === selected);
  const scored = useMemo(() => assets.map((a) => { const s = riskScore(a); return { ...a, score: s, tier: riskTier(s), residual: residualScore(a, a.controls) }; }).sort((a, b) => b.score - a.score), [assets]);
  const stats = labStats(assets);
  const rows = scored.filter((a) => (!cell || (likelihood(a) === cell[0] && a.criticality === cell[1])) && (!tierF || a.tier === tierF) && (!q || `${a.name} ${a.scenario} ${a.type}`.toLowerCase().includes(q.toLowerCase())));
  const up = (patch: Parameters<typeof mut.update>[1], delay?: number) => { if (!cur) return; if (!editable) return void toast.error("Viewers can't edit assets"); mut.update(cur.id, patch, delay); };
  const resetSim = () => { setSimState({}); toast.success("Simulation reset"); };
  const addAsset = async () => { if (!editable) return void toast.error("Viewers can't add assets"); const nid = await mut.create(); if (nid) setSelected(nid); };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setCmd((v) => !v); return; }
      const t = e.target as HTMLElement;
      if (["INPUT", "SELECT", "TEXTAREA"].includes(t.tagName) || t.isContentEditable || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") { setTour(false); setCmd(false); return; }
      const i = scored.findIndex((a) => a.id === cur?.id);
      if (e.key === "n") addAsset();
      else if (e.key === "j" && scored[i + 1]) setSelected(scored[i + 1]!.id);
      else if (e.key === "k" && i > 0) setSelected(scored[i - 1]!.id);
      else if (e.key === "r") resetSim();
      else if (e.key === "p") navigate({ to: "/w/$id/present", params: { id } });
      else if (e.key === "?") setTour(true);
    };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  });

  async function applyPlan() {
    const changed = Object.entries(sim);
    for (const [aid, c] of changed) mut.update(aid, { controls: c }, 0);
    setSimState({}); toast.success(`Mitigation plan applied to ${changed.length} asset(s)`);
  }

  if (ws.isError) throw ws.error;
  if (ws.isLoading || assetsQ.isLoading) return <div className="grid gap-6 p-6 lg:grid-cols-[400px_1fr]"><div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div><Skeleton className="h-[600px]" /></div>;

  return <div className="relative isolate min-h-screen font-sans">
    <CyberBackdrop subtle />
    <Tour open={tour} onClose={() => setTour(false)} />
    <CommandDialog open={cmd} onOpenChange={setCmd}>
      <CommandInput placeholder="Search assets, scenarios or actions…" /><CommandList><CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Assets">{scored.map((a) => <CommandItem key={a.id} value={`${a.name} ${a.scenario} ${a.type}`} onSelect={() => { setSelected(a.id); setCmd(false); }}>{a.name}<span className="ml-auto font-mono text-xs text-muted-foreground">{a.score}</span></CommandItem>)}</CommandGroup>
        <CommandGroup heading="Go to">{TABS.map((t) => <CommandItem key={t} onSelect={() => { setTab(t); setCmd(false); }}>{t}</CommandItem>)}
          <CommandItem onSelect={() => navigate({ to: "/w/$id/present", params: { id } })}>Enter presentation mode</CommandItem><CommandItem onSelect={() => navigate({ to: "/w/$id/report", params: { id } })}>Export PDF report</CommandItem></CommandGroup>
      </CommandList></CommandDialog>

    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/90 px-4 py-3 sm:px-6">
      <div className="min-w-0"><Link to="/workspaces" className="font-mono text-lg font-semibold text-primary">Threat Detector_</Link>
        <p className="truncate text-xs text-muted-foreground">{ws.data?.name} · {myRole ? ROLE_LABEL[myRole] : "…"} · <span className="text-tier-low">●</span> {online.length} online</p></div>
      <div className="flex -space-x-2">{online.slice(0, 6).map((o) => <Tip key={o.user_id}><TooltipTrigger asChild><span className="grid h-7 w-7 place-items-center rounded-full border-2 border-background bg-accent font-mono text-[10px] uppercase">{o.name.slice(0, 2)}</span></TooltipTrigger><TooltipContent>{o.name} is online</TooltipContent></Tip>)}</div>
      <nav className="flex flex-wrap gap-2 font-mono text-xs">
        <Button size="sm" variant="outline" onClick={() => setCmd(true)}>Search ⌘K</Button>
        <Button size="sm" variant="outline" onClick={() => setTour(true)}>? Tour</Button>
        <Button size="sm" variant="outline" onClick={() => download(`${ws.data?.name ?? "threat-detector"}-assets.csv`, assetsCsv(assets))}>CSV</Button>
        <Button size="sm" variant="outline" asChild><Link to="/w/$id/report" params={{ id }}>PDF report</Link></Button>
        <Button size="sm" asChild><Link to="/w/$id/present" params={{ id }}>▶ ENTER PRESENTATION MODE</Link></Button>
      </nav>
    </header>

    <main className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(320px,410px)_1fr]">
      <section className="space-y-4" aria-label="Asset inputs">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Assets" value={String(assets.length)} />
          <Stat label="Avg risk score" value={stats.avgRisk.toFixed(1)} />
          {TIERS.map((t) => <button key={t} onClick={() => setTierF(tierF === t ? "" : t)} className="text-left" aria-pressed={tierF === t}><Stat label={t} value={String(stats.counts[t])} cls={`${TIER_CLS[t]} ${tierF === t ? "ring-2 ring-foreground" : ""}`} /></button>)}
        </div>
        <Panel title="asset input" right={editable && <div className="flex gap-2"><Button size="sm" onClick={addAsset}>+ Add (N)</Button>
          {cur && <Confirm title={`Delete ${cur.name}?`} description="The asset is removed for the whole team. This is recorded in the activity history." onConfirm={() => { mut.remove(cur.id); setSelected(""); }}><Button size="sm" variant="outline" className="border-destructive text-destructive">Delete</Button></Confirm>}</div>}>
          {!assets.length ? <p className="text-sm text-muted-foreground">No assets yet. {editable ? "Add your first lab asset." : ""}</p> : <div className="space-y-3">
            <select className={field} value={cur?.id ?? ""} onChange={(e) => setSelected(e.target.value)} aria-label="Select asset">{scored.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
            {cur && <fieldset disabled={!editable} className="space-y-3 disabled:opacity-70">
              {!editable && <p className="rounded border border-border p-2 text-xs text-muted-foreground">You're a Viewer — editing is disabled.</p>}
              <L t="Asset name"><input className={field} value={cur.name} maxLength={80} onChange={(e) => up({ name: e.target.value }, 800)} /></L>
              <div className="grid grid-cols-2 gap-2">
                <L t="Coursework scenario"><input className={field} value={cur.scenario} maxLength={80} onChange={(e) => up({ scenario: e.target.value }, 800)} /></L>
                <L t="Type"><input className={field} value={cur.type} maxLength={60} onChange={(e) => up({ type: e.target.value }, 800)} list="asset-types" /></L>
              </div>
              <datalist id="asset-types">{["Internet gateway", "Firewall", "Wi-Fi access point", "Windows client", "Active Directory server", "Linux server", "Web application", "Database", "Virtualization host", "Security testing machine", "IoT device", "PLC simulator"].map((t) => <option key={t} value={t} />)}</datalist>
              <L t={`Vulnerability rating: ${cur.vulnerability.toFixed(1)} / 10${cur.cvss ? " (from CVSS base score)" : ""}`}><input type="range" min={0} max={10} step={0.1} disabled={!!cur.cvss || !editable} value={cur.vulnerability} onChange={(e) => up({ vulnerability: +e.target.value })} className="w-full accent-primary disabled:opacity-40" aria-label="Vulnerability rating" /></L>
              <CvssPanel value={cur.cvss} disabled={!editable} onChange={(c, s) => up(c ? { cvss: c, vulnerability: s ?? cur.vulnerability } : { cvss: null }, 300)} />
              <L t={`Asset criticality (impact): ${cur.criticality} / 5`}><input type="range" min={1} max={5} step={1} value={cur.criticality} onChange={(e) => up({ criticality: +e.target.value })} className="w-full accent-primary" aria-label="Criticality" /></L>
              <L t="Network exposure"><div className="grid grid-cols-4 gap-1" role="radiogroup">{EXPOSURES.map((x) => <button type="button" role="radio" aria-checked={cur.exposure === x} key={x} onClick={() => up({ exposure: x }, 0)} className={`rounded border px-1 py-1.5 text-xs capitalize ${cur.exposure === x ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>{x}</button>)}</div></L>
              <L t="Can reach (directional connections)"><div className="flex max-h-28 flex-wrap gap-1 overflow-y-auto">{assets.filter((a) => a.id !== cur.id).map((a) => { const on = cur.links.includes(a.id);
                return <button type="button" key={a.id} aria-pressed={on} onClick={() => up({ links: on ? cur.links.filter((l) => l !== a.id) : [...cur.links, a.id] }, 0)} className={`rounded border px-1.5 py-0.5 text-[10px] ${on ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>{on ? "→ " : ""}{a.name}</button>; })}</div></L>
              <div className="text-[11px] text-muted-foreground">Applied mitigations: {cur.controls.length ? cur.controls.map((c) => CONTROL_INFO[c].short).join(", ") : "none"} (change in What-if)</div>
            </fieldset>}
            {cur && (() => { const s = riskScore(cur), t = riskTier(s), r = residualScore(cur, cur.controls); return <div className="grid grid-cols-3 gap-2 font-mono">
              <div className="rounded-md border border-border p-2"><div className="text-[10px] text-muted-foreground">CVSS v3.1</div><div className="text-xl">{cur.cvss ? cvssScore(cur.cvss).toFixed(1) : "—"}</div></div>
              <div className={`rounded-md border p-2 transition-colors duration-500 ${TIER_CLS[t]}`}><div className="text-[10px] opacity-80">Risk score</div><div key={s} className="text-xl font-semibold animate-in zoom-in-95 fade-in">{s.toFixed(1)}</div><div className="text-[10px]">{t}</div></div>
              <div className="rounded-md border border-primary/50 p-2 text-primary"><div className="text-[10px] opacity-80">Residual</div><div key={r} className="text-xl animate-in fade-in">{r.toFixed(1)}</div></div></div>; })()}
            <p className="font-mono text-[10px] text-muted-foreground">risk = vuln/10 × exposure(0.25|0.5|0.75|1) × crit/5 × 100</p>
          </div>}
        </Panel>
      </section>

      <section className="min-w-0 space-y-6" aria-label="Results">
        <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1" role="tablist">
          {TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`rounded-md px-3 py-1.5 font-mono text-xs transition-colors ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{t}</button>)}
        </div>
        <div role="tabpanel">
          {tab === "Impact" && <Panel title="impact chart — Threat Detector risk score"><div className="h-80"><ResponsiveContainer><BarChart data={scored} margin={{ bottom: 70 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="name" angle={-40} textAnchor="end" interval={0} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
            <YAxis domain={[0, 100]} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} /><Tooltip {...chartTip} />
            <Bar dataKey="score" name="Risk score" radius={[3, 3, 0, 0]} onClick={(d: { id?: string }) => d.id && setSelected(d.id)} animationDuration={500}>{scored.map((a) => <Cell key={a.id} fill={TIER_VAR[a.tier]} cursor="pointer" />)}</Bar>
          </BarChart></ResponsiveContainer></div></Panel>}
          {tab === "Heatmap" && <Panel title="likelihood × impact matrix" right={cell && <button onClick={() => setCell(null)} className="text-xs text-muted-foreground hover:text-foreground">clear cell filter</button>}><Heatmap assets={assets} filter={cell} onFilter={setCell} /><p className="mt-2 text-xs text-muted-foreground">Hover a cell to preview assets; click to filter the inventory below.</p></Panel>}
          {tab === "Attack paths" && <Panel title="attack path graph"><AttackFlow assets={assets} selected={cur?.id} onSelect={setSelected} /></Panel>}
          {tab === "What-if" && <Panel title="what-if mitigation simulator"><Simulator assets={assets} sim={sim} setSim={(aid, c) => setSimState((s) => ({ ...s, [aid]: c }))} model={model} setModel={setModel} selected={cur} canApply={editable} onApply={applyPlan} onReset={resetSim} /></Panel>}
          {tab === "AI analyst" && <Panel title="AI risk analyst"><AnalystPanel workspaceId={id} /></Panel>}
          {tab === "Trends" && <Panel title="semester trend tracking"><Trends snapshots={snaps.data ?? []} canSave={editable} onSave={(l) => me.data && mut.snapshot(assets, l, me.data.id)} /></Panel>}
          {tab === "Team" && <Panel title="team"><Team wsId={id} inviteCode={ws.data?.invite_code ?? ""} members={members.data ?? []} myRole={myRole} myId={me.data?.id ?? ""} online={online} /></Panel>}
          {tab === "Files" && <Panel title="workspace files"><Files workspaceId={id} userId={me.data?.id ?? ""} role={myRole} members={members.data ?? []} /></Panel>}
          {tab === "Activity" && <Panel title="activity log — asset additions & changes">{activity.isError || members.isError ? <p role="alert" className="text-sm text-destructive">Activity details could not be loaded. <Button size="sm" variant="outline" onClick={() => { activity.refetch(); members.refetch(); }}>Retry</Button></p> : activity.isPending || members.isPending ? <Skeleton className="h-24" /> : <Activity rows={activity.data ?? []} members={members.data ?? []} assetsById={new Map(assets.map((a) => [a.id, a.name]))} />}</Panel>}
        </div>

        <div className="rounded-lg border border-border bg-card">
          <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter inventory…" className={`${field} max-w-xs`} aria-label="Filter assets" />
            <select value={tierF} onChange={(e) => setTierF(e.target.value as Tier | "")} className={`${field} w-36`} aria-label="Filter by tier"><option value="">All tiers</option>{TIERS.map((t) => <option key={t}>{t}</option>)}</select>
            {(cell || tierF || q) && <button onClick={() => { setCell(null); setTierF(""); setQ(""); }} className="text-xs text-muted-foreground hover:text-foreground">clear filters</button>}
            <span className="ml-auto text-xs text-muted-foreground">{rows.length} of {assets.length}</span>
          </div>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="font-mono text-xs text-muted-foreground"><tr className="border-b border-border">{["Asset", "Scenario", "Vuln", "CVSS", "Exposure", "Crit", "Risk", "Residual", "Tier"].map((h) => <th key={h} className="px-3 py-2 text-left font-normal">{h}</th>)}</tr></thead>
            <tbody>{rows.length ? rows.map((a) => <tr key={a.id} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setSelected(a.id)} onClick={() => setSelected(a.id)} className={`cursor-pointer border-b border-border/50 transition-colors hover:bg-muted focus:bg-muted focus:outline-none ${a.id === cur?.id ? "bg-accent" : ""}`}>
              <td className="px-3 py-2">{a.name}</td><td className="px-3 py-2 text-muted-foreground">{a.scenario}</td><td className="px-3 py-2 font-mono">{a.vulnerability.toFixed(1)}</td><td className="px-3 py-2 font-mono">{a.cvss ? cvssScore(a.cvss).toFixed(1) : "—"}</td>
              <td className="px-3 py-2 capitalize">{a.exposure}</td><td className="px-3 py-2 font-mono">{a.criticality}</td><td className="px-3 py-2 font-mono font-semibold">{a.score.toFixed(1)}</td><td className="px-3 py-2 font-mono text-primary">{a.residual.toFixed(1)}</td>
              <td className="px-3 py-2"><span className={`rounded border px-1.5 py-0.5 text-xs ${TIER_CLS[a.tier]}`}>{a.tier}</span></td></tr>)
              : <tr><td colSpan={9} className="p-6 text-center text-sm text-muted-foreground">No assets match these filters.</td></tr>}</tbody></table></div>
        </div>
      </section>
    </main>
  </div>;
}
