import type { ReactNode } from "react";
import type { Tier } from "@/lib/scoring";
export const TIER_VAR: Record<Tier, string> = { Critical: "var(--tier-critical)", High: "var(--tier-high)", Medium: "var(--tier-medium)", Low: "var(--tier-low)" };
export const TIER_CLS: Record<Tier, string> = { Critical: "text-tier-critical border-tier-critical", High: "text-tier-high border-tier-high", Medium: "text-tier-medium border-tier-medium", Low: "text-tier-low border-tier-low" };
export const field = "w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring";
export function Panel({ title, children, right, id }: { title: string; children: ReactNode; right?: ReactNode; id?: string }) {
  return <div id={id} className="rounded-lg border border-border bg-card p-4 animate-in fade-in duration-300">
    <div className="mb-3 flex items-center justify-between gap-2"><h2 className="font-mono text-sm text-primary">// {title}</h2>{right}</div>{children}</div>;
}
export function Stat({ label, value, cls = "text-foreground border-border", big }: { label: string; value: string; cls?: string; big?: boolean }) {
  return <div className={`rounded-lg border bg-card p-3 ${cls}`}><div className="text-[11px] uppercase tracking-wide opacity-80">{label}</div>
    <div key={value} className={`font-mono font-semibold animate-in zoom-in-95 fade-in duration-300 ${big ? "text-6xl" : "text-2xl"}`}>{value}</div></div>;
}
export function L({ t, children }: { t: string; children: ReactNode }) {
  return <label className="block space-y-1"><span className="text-xs text-muted-foreground">{t}</span>{children}</label>;
}
