import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bar, BarChart, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { cvssScore, cvssSeverity, cvssVector, CONTROL_INFO, DEFAULT_MODEL, labStats, residualScore, riskScore, riskTier, TIERS } from "@/lib/scoring";
import { assetsQuery, membersQuery, wsQuery } from "@/hooks/use-workspace";
import { ruleBasedReport, type AnalystReport } from "@/lib/analyst";
import { ReportView } from "@/components/tg/AnalystPanel";
import { TIER_VAR } from "@/components/tg/ui";
import { Heatmap } from "@/components/tg/Heatmap";
import { AttackFlow } from "@/components/tg/AttackFlow";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ROLE_LABEL } from "@/lib/db";
import { assetsCsv, download } from "@/lib/csv";

export const Route = createFileRoute("/_authenticated/w_/$id/report")({
  head: () => ({ meta: [{ title: "Risk report — Threat Detector" }, { name: "description", content: "Printable coursework lab risk report." }, { property: "og:title", content: "Threat Detector Risk Report" }, { property: "og:description", content: "Coursework-ready lab risk report." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Report,
});
function Report() {
  const { id } = Route.useParams(); const qc = useQueryClient();
  const ws = useQuery(wsQuery(id)); const aq = useQuery(assetsQuery(id)); const mq = useQuery(membersQuery(id));
  if (aq.isLoading || ws.isLoading) return <div className="p-10"><Skeleton className="h-[80vh]" /></div>;
  const assets = aq.data ?? [];
  const rows = assets.map((a) => { const s = riskScore(a); return { ...a, score: s, tier: riskTier(s), residual: residualScore(a, a.controls) }; }).sort((a, b) => b.score - a.score);
  const ai = qc.getQueryData<AnalystReport & { note?: string }>(["ws", id, "analyst"]);
  const rules = ruleBasedReport(assets); const st = labStats(assets);
  const dist = TIERS.map((t) => ({ name: t, value: st.counts[t] }));
  const H2 = ({ n, children }: { n: number; children: React.ReactNode }) => <h2 className="mb-2 mt-8 border-b border-border pb-1 text-lg font-semibold"><span className="font-mono text-primary">{n}.</span> {children}</h2>;
  return <div className="report mx-auto max-w-4xl bg-background p-8 font-sans text-sm">
    <div className="no-print mb-6 flex flex-wrap justify-between gap-2"><Link to="/w/$id" params={{ id }} className="text-sm text-muted-foreground">← Back to workspace</Link>
      <div className="flex gap-2"><Button variant="outline" onClick={() => download(`${ws.data?.name}-assets.csv`, assetsCsv(assets))}>Download CSV</Button><Button onClick={() => window.print()}>Download PDF</Button></div></div>
    <p className="no-print mb-4 text-xs text-muted-foreground">Tip: in the print dialog choose "Save as PDF". Page numbers are added automatically.</p>
    <header className="border-b-4 border-primary pb-4">
      <div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-md bg-primary font-mono text-xl font-bold text-primary-foreground">TD</div><div><div className="font-mono text-3xl font-semibold text-primary">Threat Detector</div><div className="text-xs uppercase tracking-widest text-muted-foreground">Lab Vulnerability Exposure Assessment</div></div></div>
      <h1 className="mt-4 text-2xl font-semibold">{ws.data?.name}</h1>
      <p className="text-muted-foreground">Coursework context: Middlesex University Dubai cybersecurity lab exercise · Assessment date {new Date().toLocaleDateString()}</p>
      <p className="mt-1">Team: {(mq.data ?? []).map((m) => `${m.display_name} (${ROLE_LABEL[m.role]})`).join(", ")}</p>
    </header>
    <H2 n={1}>Executive summary</H2><p>{(ai ?? rules).executiveSummary}</p>
    <div className="mt-3 grid grid-cols-4 gap-2 text-center">{TIERS.map((t) => <div key={t} className="rounded border border-border p-2"><div className="text-xs" style={{ color: TIER_VAR[t] }}>{t}</div><div className="font-mono text-2xl">{st.counts[t]}</div></div>)}</div>
    <p className="mt-2 text-xs text-muted-foreground">Average risk {st.avgRisk} · average residual {st.avgResidual} · applied-mitigation reduction {st.reduction}%</p>
    <H2 n={2}>Asset inventory</H2>
    <table className="w-full text-xs"><thead><tr className="border-b border-border text-left">{["Asset", "Scenario", "Type", "Vuln", "Exposure", "Crit", "Risk", "Residual", "Tier"].map((h) => <th key={h} className="py-1 pr-1">{h}</th>)}</tr></thead>
      <tbody>{rows.map((a) => <tr key={a.id} className="border-b border-border/50"><td className="py-1 pr-1">{a.name}</td><td>{a.scenario}</td><td>{a.type}</td><td>{a.vulnerability}</td><td className="capitalize">{a.exposure}</td><td>{a.criticality}</td><td className="font-mono">{a.score}</td><td className="font-mono">{a.residual}</td><td style={{ color: TIER_VAR[a.tier] }}>{a.tier}</td></tr>)}</tbody></table>
    <H2 n={3}>CVSS v3.1 findings</H2>
    {assets.some((a) => a.cvss) ? <table className="w-full text-xs"><tbody>{assets.filter((a) => a.cvss).map((a) => <tr key={a.id} className="border-b border-border/50"><td className="py-1">{a.name}</td><td className="font-mono">{cvssScore(a.cvss!).toFixed(1)} {cvssSeverity(cvssScore(a.cvss!))}</td><td className="font-mono text-[10px]">{cvssVector(a.cvss!)}</td></tr>)}</tbody></table>
      : <p className="text-muted-foreground">No assets use the advanced CVSS calculator yet; vulnerability ratings were entered manually.</p>}
    <div className="break-inside-avoid"><H2 n={4}>Risk heatmap & distribution</H2><div className="grid grid-cols-2 gap-6"><Heatmap assets={assets} />
      <div><PieChart width={300} height={200}><Pie data={dist} dataKey="value" nameKey="name" outerRadius={70} isAnimationActive={false} label={({ name, value }) => `${name} ${value}`}>{dist.map((d) => <Cell key={d.name} fill={TIER_VAR[d.name]} />)}</Pie></PieChart>
        <BarChart width={320} height={200} data={rows.slice(0, 8)} layout="vertical" margin={{ left: 90 }}><XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9 }} /><YAxis type="category" dataKey="name" tick={{ fontSize: 8 }} width={90} /><Bar dataKey="score" isAnimationActive={false}>{rows.slice(0, 8).map((a) => <Cell key={a.id} fill={TIER_VAR[a.tier]} />)}</Bar></BarChart></div></div></div>
    <div className="break-inside-avoid"><H2 n={5}>Attack path diagram (simulated topology)</H2><AttackFlow assets={assets} height={420} interactive={false} /></div>
    <H2 n={6}>Mitigation recommendations</H2>{rules.recommendations.map((r, i) => <p key={i} className="mb-1"><b>{r.priority} · {r.asset}:</b> {r.remediation} <span className="text-muted-foreground">({r.explanation}{r.mitre ? ` · ${r.mitre}` : ""})</span></p>)}
    <H2 n={7}>AI analyst report</H2>{ai ? <ReportView r={ai} /> : <p className="text-muted-foreground">No AI analysis was run for this export. Run "Analyze lab security" in the workspace before exporting to include it.</p>}
    <H2 n={8}>Methodology & limitations</H2>
    <ul className="list-disc space-y-1 pl-5 text-xs">
      <li><b>CVSS v3.1 base score</b> follows the FIRST specification (base metrics only; temporal/environmental not applied).</li>
      <li><b>Threat Detector risk score</b> = vulnerability/10 × exposure weight (isolated 0.25, internal 0.5, campus 0.75, internet 1) × criticality/5 × 100. Tiers: Critical ≥ 60, High ≥ 35, Medium ≥ 15, Low &lt; 15.</li>
      <li><b>Residual risk</b> uses an educational mitigation model: {Object.values(CONTROL_INFO).map((c) => `${c.label} — ${c.assumption(DEFAULT_MODEL)}`).join("; ")}.</li>
      <li>Attack paths are derived from the team-configured simulated topology and do not prove real exploitability. Data is mock coursework data.</li>
      <li>Threat Detector is an independent student project. It is not endorsed or certified by Middlesex University.</li>
    </ul>
  </div>;
}
