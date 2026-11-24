import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { labStats, riskScore, riskTier, TIERS, residualScore } from "@/lib/scoring";
import { assetsQuery, membersQuery, wsQuery } from "@/hooks/use-workspace";
import { Heatmap } from "@/components/tg/Heatmap";
import { Gauge } from "@/components/tg/Gauge";
import { AttackFlow } from "@/components/tg/AttackFlow";
import { CountUp } from "@/components/tg/CountUp";
import { TIER_CLS } from "@/components/tg/ui";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/w_/$id/present")({
  head: () => ({ meta: [{ title: "Presentation — Threat Detector" }, { name: "description", content: "Full-screen lab threat dashboard." }, { property: "og:title", content: "Threat Detector Presentation" }, { property: "og:description", content: "Live lab threat level for demos." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Present,
});
const SECTIONS = ["Threat level", "Risk heatmap", "Top 5 riskiest", "Attack paths", "Risk reduction"];

function Present() {
  const { id } = Route.useParams(); const navigate = useNavigate();
  const ws = useQuery(wsQuery(id)); const aq = useQuery(assetsQuery(id)); const mq = useQuery(membersQuery(id));
  const [i, setI] = useState(0);
  const assets = aq.data ?? [];
  const exit = () => { if (document.fullscreenElement) document.exitFullscreen(); navigate({ to: "/w/$id", params: { id } }); };
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.fullscreenElement) exit();
      else if (["ArrowRight", "PageDown", " "].includes(e.key)) { e.preventDefault(); setI((x) => Math.min(SECTIONS.length - 1, x + 1)); }
      else if (["ArrowLeft", "PageUp"].includes(e.key)) setI((x) => Math.max(0, x - 1));
      else if (e.key === "f") document.documentElement.requestFullscreen?.();
      else if (/^[1-5]$/.test(e.key)) setI(+e.key - 1);
    };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  });
  if (aq.isLoading) return <div className="p-10"><Skeleton className="h-[80vh]" /></div>;
  const st = labStats(assets);
  const top = assets.map((a) => ({ a, s: riskScore(a) })).sort((x, y) => y.s - x.s).slice(0, 5);

  return <div className="flex min-h-screen flex-col grid-bg p-6 font-sans sm:p-10">
    <div className="flex items-start justify-between gap-4">
      <div><h1 className="font-mono text-3xl font-semibold text-primary sm:text-4xl">Threat Detector_ <span className="text-muted-foreground">LIVE</span></h1>
        <p className="text-base text-muted-foreground">{ws.data?.name} · {assets.length} assets · {mq.data?.length ?? 0} team members · {new Date().toLocaleDateString()}</p></div>
      <div className="flex gap-2"><button onClick={() => document.documentElement.requestFullscreen?.()} className="rounded border border-border px-3 py-2 font-mono text-xs text-muted-foreground hover:text-foreground">Fullscreen (F)</button>
        <button onClick={exit} className="rounded border border-destructive px-3 py-2 font-mono text-xs text-destructive">Exit (Esc)</button></div>
    </div>
    <nav className="mt-6 flex flex-wrap gap-2" aria-label="Presentation sections">{SECTIONS.map((s, j) => <button key={s} onClick={() => setI(j)} aria-current={i === j} className={`rounded-full px-4 py-1.5 font-mono text-sm transition-colors ${i === j ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"}`}>{j + 1}. {s}</button>)}</nav>
    <section key={i} className="mt-8 flex-1 animate-in fade-in slide-in-from-right-8 duration-500">
      {i === 0 && <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.4fr]"><div className="flex justify-center"><Gauge value={st.avgRisk} /></div>
        <div className="grid grid-cols-2 gap-4">{TIERS.map((t) => <div key={t} className={`rounded-xl border-2 bg-card p-6 ${TIER_CLS[t]}`}><div className="text-lg uppercase tracking-wide">{t}</div><div className="font-mono text-7xl font-semibold"><CountUp value={st.counts[t]} /></div></div>)}</div></div>}
      {i === 1 && <div className="mx-auto max-w-4xl rounded-xl border border-border bg-card p-6"><Heatmap assets={assets} big /></div>}
      {i === 2 && <ol className="mx-auto max-w-4xl space-y-3">{top.map(({ a, s }, j) => <li key={a.id} className={`flex items-center gap-6 rounded-xl border-2 bg-card p-5 animate-in fade-in slide-in-from-bottom-4 ${TIER_CLS[riskTier(s)]}`} style={{ animationDelay: `${j * 120}ms`, animationFillMode: "both" }}>
        <span className="font-mono text-4xl opacity-60">#{j + 1}</span><div className="flex-1"><div className="text-2xl font-semibold text-foreground">{a.name}</div><div className="text-base text-muted-foreground">{a.scenario} · {a.exposure}</div></div>
        <div className="text-right"><div className="font-mono text-5xl font-semibold"><CountUp value={s} decimals={1} /></div><div className="text-sm">{riskTier(s)}</div></div></li>)}</ol>}
      {i === 3 && <div className="rounded-xl border border-border bg-card p-4"><AttackFlow assets={assets} height={560} interactive={false} /></div>}
      {i === 4 && <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-3">
        {[["Original avg risk", st.avgRisk, ""], ["Residual avg risk", st.avgResidual, ""], ["Risk reduction", st.reduction, "%"]].map(([l, v, u]) => <div key={l as string} className="rounded-xl border-2 border-primary bg-card p-8 text-center"><div className="text-lg text-muted-foreground">{l}</div><div className="font-mono text-7xl font-semibold text-primary"><CountUp value={v as number} decimals={1} />{u}</div></div>)}
        <p className="text-center text-base text-muted-foreground sm:col-span-3">From {assets.filter((a) => a.controls.length).length} assets with applied mitigations · {assets.reduce((n, a) => n + (riskScore(a) - residualScore(a, a.controls) > 0 ? 1 : 0), 0)} assets improved</p></div>}
    </section>
    <p className="mt-6 text-center font-mono text-xs text-muted-foreground">← → navigate · 1–5 jump · F fullscreen · Esc exit</p>
  </div>;
}
