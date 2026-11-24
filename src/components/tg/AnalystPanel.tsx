import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { analyzeLab } from "@/lib/analyst.functions";
import type { AnalystReport } from "@/lib/analyst";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function AnalystPanel({ workspaceId }: { workspaceId: string }) {
  const qc = useQueryClient(); const run = useServerFn(analyzeLab);
  const key = ["ws", workspaceId, "analyst"];
  const [busy, setBusy] = useState(false);
  const report = qc.getQueryData<AnalystReport & { note?: string }>(key);
  const [, force] = useState(0);
  async function go() {
    setBusy(true);
    try { const r = await run({ data: { workspaceId } }); qc.setQueryData(key, r); force((n) => n + 1); toast.success(r.source === "ai" ? "AI analysis complete" : "Rule-based analysis complete"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Analysis failed"); }
    finally { setBusy(false); }
  }
  return <div className="space-y-4">
    <Button size="lg" className="w-full font-mono tracking-wider" onClick={go} disabled={busy}>{busy ? "ANALYZING…" : "▶ ANALYZE LAB SECURITY"}</Button>
    {busy && <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div>}
    {!busy && !report && <p className="text-sm text-muted-foreground">Generates a structured report from this workspace's real asset data: executive summary, top risks, simulated attack paths, impact, prioritised remediation and MITRE ATT&CK mappings.</p>}
    {!busy && report && <ReportView r={report} />}
  </div>;
}
export function ReportView({ r }: { r: AnalystReport & { note?: string } }) {
  const H = ({ children }: { children: React.ReactNode }) => <h3 className="mb-1.5 mt-4 font-mono text-xs uppercase tracking-wider text-primary">{children}</h3>;
  return <div className="text-sm animate-in fade-in">
    <div className="flex flex-wrap items-center gap-2"><span className={`rounded border px-2 py-0.5 font-mono text-[10px] ${r.source === "ai" ? "border-primary text-primary" : "border-tier-medium text-tier-medium"}`}>{r.source === "ai" ? "AI-GENERATED" : "RULE-BASED (DETERMINISTIC)"}</span><span className="text-xs text-muted-foreground">{new Date(r.generatedAt).toLocaleString()}</span></div>
    {r.note && <p className="mt-2 text-xs text-tier-medium">{r.note}</p>}
    <H>1 · Executive summary</H><p>{r.executiveSummary}</p>
    <H>2 · Top three riskiest assets</H>{r.topAssets.map((t) => <div key={t.name} className="border-b border-border/50 py-1.5"><span className="font-mono font-semibold">{t.riskScore}</span> <span className="text-xs text-muted-foreground">{t.tier}</span> — {t.name}<div className="text-xs text-muted-foreground">{t.why}</div></div>)}
    <H>3 · Critical vulnerabilities</H>{r.criticalVulnerabilities.length ? r.criticalVulnerabilities.map((c) => <p key={c.asset}>• <b>{c.asset}</b>: {c.detail}</p>) : <p className="text-muted-foreground">None flagged.</p>}
    <H>4 · Potential attack paths (simulated, not observed)</H>{r.attackPaths.length ? r.attackPaths.map((p, i) => <div key={i} className="mb-1.5"><div className="font-mono text-xs text-tier-critical">{p.path.join(" → ")}</div><div className="text-xs text-muted-foreground">{p.narrative}</div></div>) : <p className="text-muted-foreground">No paths in the configured topology.</p>}
    <H>5 · Business & operational impact</H><p>{r.impact}</p>
    <H>6 · Prioritised remediation</H><div className="space-y-2">{r.recommendations.map((x, i) => <div key={i} className="rounded border border-border p-2"><div className="flex flex-wrap items-center gap-2"><span className={`rounded px-1.5 font-mono text-[10px] font-bold ${x.priority === "P1" ? "bg-tier-critical text-background" : x.priority === "P2" ? "bg-tier-high text-background" : "bg-muted text-foreground"}`}>{x.priority}</span><b>{x.asset}</b>{x.mitre && <span className="font-mono text-[10px] text-muted-foreground">{x.mitre}</span>}</div><p className="mt-1 text-xs text-muted-foreground">{x.explanation}</p><p className="mt-1 text-xs">→ {x.remediation}</p></div>)}</div>
    <H>7 · MITRE ATT&CK mappings</H><div className="flex flex-wrap gap-1.5">{r.mitre.map((m, i) => <span key={i} className="rounded border border-border px-2 py-0.5 text-xs"><span className="font-mono text-primary">{m.id}</span> {m.name} · {m.asset}</span>)}</div>
  </div>;
}
