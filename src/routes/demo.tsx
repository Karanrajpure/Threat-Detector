import { createFileRoute, Link } from "@tanstack/react-router";
import { CyberBackdrop } from "@/components/three/CyberBackdrop";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { DEFAULT_MODEL, EXPOSURES, cvssScore, labStats, likelihood, residualScore, riskScore, riskTier, TIERS, type Asset, type Control, type MitigationModel } from "@/lib/scoring";
import { demoAssets } from "@/lib/demo-data";
import { ruleBasedReport } from "@/lib/analyst";
import { Panel, Stat, L, TIER_CLS, TIER_VAR, field } from "@/components/tg/ui";
import { CvssPanel } from "@/components/tg/CvssPanel";
import { Heatmap } from "@/components/tg/Heatmap";
import { AttackFlow } from "@/components/tg/AttackFlow";
import { Simulator, chartTip } from "@/components/tg/Simulator";
import { ReportView } from "@/components/tg/AnalystPanel";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/demo")({
  head: () => ({ meta: [{ title: "Try Threat Detector — No sign-up needed" }, { name: "description", content: "Score 15 demo cyber lab assets instantly with CVSS, heatmaps, attack paths and what-if mitigation." }, { property: "og:title", content: "Try Threat Detector free" }, { property: "og:description", content: "Instant lab risk scoring demo — no account required." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Demo,
});
const TABS = ["Impact", "Heatmap", "Attack paths", "What-if", "Analyst"] as const;
const LOCKED = ["Team workspaces", "Live sync", "AI analyst", "Trends", "PDF export"];

function Demo() {
  const [assets, setAssets] = useState<Asset[]>(demoAssets);
  const [selected, setSelected] = useState("1");
  const [tab, setTab] = useState<(typeof TABS)[number]>("Impact");
  const [cell, setCell] = useState<[number, number] | null>(null);
  const [sim, setSim] = useState<Record<string, Control[]>>({});
  const [model, setModel] = useState<MitigationModel>(DEFAULT_MODEL);
  const [nudge, setNudge] = useState(false);
  const edits = useRef(0);
  const cur = assets.find((a) => a.id === selected);
  const scored = useMemo(() => assets.map((a) => { const s = riskScore(a); return { ...a, score: s, tier: riskTier(s), residual: residualScore(a, a.controls) }; }).sort((a, b) => b.score - a.score), [assets]);
  const st = labStats(assets);
  const rows = cell ? scored.filter((a) => likelihood(a) === cell[0] && a.criticality === cell[1]) : scored;
  const up = (p: Partial<Asset>) => { setAssets((xs) => xs.map((a) => (a.id === selected ? { ...a, ...p } : a)));
    edits.current++; if (edits.current === 6) toast("Like what you see?", { description: "Create a free account to save your work and share it with your team.", action: { label: "Sign up", onClick: () => window.location.assign("/auth?mode=up") }, duration: 10000 }); };
  useEffect(() => { const t = setTimeout(() => setNudge(true), 45000); return () => clearTimeout(t); }, []);

  return <div className="relative isolate min-h-screen font-sans">
    <CyberBackdrop subtle />
    <div className="flex flex-wrap items-center justify-center gap-3 border-b border-primary/40 bg-accent px-4 py-2 text-sm">
      <span>You're trying Threat Detector as a guest — changes aren't saved.</span>
      <Button size="sm" asChild><Link to="/auth" search={{ redirect: "/workspaces", mode: "up" }}>Sign up free to save & collaborate</Link></Button></div>
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/90 px-4 py-3 sm:px-6">
      <div><Link to="/" className="font-mono text-lg font-semibold text-primary">Threat Detector_</Link><p className="text-xs text-muted-foreground">Guest demo · 15 campus lab assets</p></div>
      <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => { setAssets(demoAssets()); setSim({}); }}>Reset demo</Button><Button size="sm" variant="outline" asChild><Link to="/auth" search={{ redirect: undefined, mode: undefined }}>Sign in</Link></Button></div>
    </header>
    <main className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(320px,410px)_1fr]">
      <section className="space-y-4">
        <div className="grid grid-cols-2 gap-3"><Stat label="Assets" value={String(assets.length)} /><Stat label="Avg risk score" value={st.avgRisk.toFixed(1)} />{TIERS.map((t) => <Stat key={t} label={t} value={String(st.counts[t])} cls={TIER_CLS[t]} />)}</div>
        <Panel title="asset input">{cur && <div className="space-y-3">
          <select className={field} value={cur.id} onChange={(e) => setSelected(e.target.value)} aria-label="Select asset">{scored.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
          <L t="Asset name"><input className={field} value={cur.name} maxLength={80} onChange={(e) => up({ name: e.target.value })} /></L>
          <L t={`Vulnerability rating: ${cur.vulnerability.toFixed(1)} / 10`}><input type="range" min={0} max={10} step={0.1} disabled={!!cur.cvss} value={cur.vulnerability} onChange={(e) => up({ vulnerability: +e.target.value })} className="w-full accent-primary disabled:opacity-40" /></L>
          <CvssPanel value={cur.cvss} onChange={(c, s) => up(c ? { cvss: c, vulnerability: s ?? cur.vulnerability } : { cvss: null })} />
          <L t={`Asset criticality: ${cur.criticality} / 5`}><input type="range" min={1} max={5} step={1} value={cur.criticality} onChange={(e) => up({ criticality: +e.target.value })} className="w-full accent-primary" /></L>
          <L t="Network exposure"><div className="grid grid-cols-4 gap-1">{EXPOSURES.map((x) => <button key={x} onClick={() => up({ exposure: x })} className={`rounded border px-1 py-1.5 text-xs capitalize ${cur.exposure === x ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>{x}</button>)}</div></L>
          {(() => { const s = riskScore(cur), t = riskTier(s); return <div className="grid grid-cols-3 gap-2 font-mono"><div className="rounded-md border border-border p-2"><div className="text-[10px] text-muted-foreground">CVSS v3.1</div><div className="text-xl">{cur.cvss ? cvssScore(cur.cvss).toFixed(1) : "—"}</div></div>
            <div className={`rounded-md border p-2 ${TIER_CLS[t]}`}><div className="text-[10px]">Risk score</div><div key={s} className="text-xl font-semibold animate-in zoom-in-95">{s.toFixed(1)}</div></div><div className="rounded-md border border-primary/50 p-2 text-primary"><div className="text-[10px]">Residual</div><div className="text-xl">{residualScore(cur, cur.controls).toFixed(1)}</div></div></div>; })()}
        </div>}</Panel>
        <div className="rounded-lg border border-dashed border-primary/50 p-4 text-sm"><p className="font-mono text-xs text-primary">// unlock with a free account</p><p className="mt-1 text-muted-foreground">{LOCKED.join(" · ")}</p>
          <Button size="sm" className="mt-3" asChild><Link to="/auth" search={{ redirect: "/workspaces", mode: "up" }}>Create account</Link></Button></div>
      </section>
      <section className="min-w-0 space-y-6">
        <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1" role="tablist">{TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`rounded-md px-3 py-1.5 font-mono text-xs ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{t}</button>)}</div>
        {tab === "Impact" && <Panel title="impact chart"><div className="h-80"><ResponsiveContainer><BarChart data={scored} margin={{ bottom: 70 }}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="name" angle={-40} textAnchor="end" interval={0} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} /><YAxis domain={[0, 100]} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} /><Tooltip {...chartTip} />
          <Bar dataKey="score" name="Risk score" radius={[3, 3, 0, 0]} onClick={(d: { id?: string }) => d.id && setSelected(d.id)}>{scored.map((a) => <Cell key={a.id} fill={TIER_VAR[a.tier]} cursor="pointer" />)}</Bar></BarChart></ResponsiveContainer></div></Panel>}
        {tab === "Heatmap" && <Panel title="likelihood × impact"><Heatmap assets={assets} filter={cell} onFilter={setCell} /></Panel>}
        {tab === "Attack paths" && <Panel title="attack path graph"><AttackFlow assets={assets} selected={cur?.id} onSelect={setSelected} /></Panel>}
        {tab === "What-if" && <Panel title="what-if simulator"><Simulator assets={assets} sim={sim} setSim={(id, c) => setSim((s) => ({ ...s, [id]: c }))} model={model} setModel={setModel} selected={cur} canApply onApply={() => { setAssets((xs) => xs.map((a) => (sim[a.id] ? { ...a, controls: sim[a.id]! } : a))); setSim({}); toast.success("Plan applied to demo"); }} onReset={() => setSim({})} /></Panel>}
        {tab === "Analyst" && <Panel title="rule-based analyst (AI version needs an account)"><ReportView r={ruleBasedReport(assets)} /></Panel>}
        <div className="overflow-x-auto rounded-lg border border-border bg-card"><table className="w-full text-sm"><thead className="font-mono text-xs text-muted-foreground"><tr className="border-b border-border">{["Asset", "Scenario", "Vuln", "Exposure", "Crit", "Risk", "Tier"].map((h) => <th key={h} className="px-3 py-2 text-left font-normal">{h}</th>)}</tr></thead>
          <tbody>{rows.map((a) => <tr key={a.id} onClick={() => setSelected(a.id)} className={`cursor-pointer border-b border-border/50 hover:bg-muted ${a.id === cur?.id ? "bg-accent" : ""}`}><td className="px-3 py-2">{a.name}</td><td className="px-3 py-2 text-muted-foreground">{a.scenario}</td><td className="px-3 py-2 font-mono">{a.vulnerability.toFixed(1)}</td><td className="px-3 py-2 capitalize">{a.exposure}</td><td className="px-3 py-2 font-mono">{a.criticality}</td><td className="px-3 py-2 font-mono font-semibold">{a.score.toFixed(1)}</td><td className="px-3 py-2"><span className={`rounded border px-1.5 py-0.5 text-xs ${TIER_CLS[a.tier]}`}>{a.tier}</span></td></tr>)}</tbody></table></div>
      </section>
    </main>
    {nudge && <div role="dialog" aria-label="Sign up" className="fixed bottom-4 left-1/2 z-50 w-[min(92vw,440px)] -translate-x-1/2 rounded-lg border border-primary bg-card p-4 shadow-terminal animate-in slide-in-from-bottom-6">
      <p className="font-semibold">Save this assessment?</p><p className="mt-1 text-sm text-muted-foreground">Sign up free to keep your changes, invite teammates and run the AI analyst.</p>
      <div className="mt-3 flex gap-2"><Button size="sm" asChild><Link to="/auth" search={{ redirect: "/workspaces", mode: "up" }}>Sign up</Link></Button><Button size="sm" variant="ghost" onClick={() => setNudge(false)}>Keep exploring</Button></div></div>}
  </div>;
}
