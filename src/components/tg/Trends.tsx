import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SnapshotRow } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { chartTip } from "./Simulator";
import { field } from "./ui";
export function Trends({ snapshots, canSave, onSave }: { snapshots: SnapshotRow[]; canSave: boolean; onSave: (label: string) => void }) {
  const [label, setLabel] = useState(`Wk ${snapshots.length + 1}`);
  const [a, setA] = useState<string>(""); const [b, setB] = useState<string>("");
  const data = snapshots.map((s) => ({ ...s, avg: Number(s.avg_score), label: s.label }));
  const first = data[0], last = data.at(-1);
  const improve = first && last && first.avg ? ((1 - last.avg / first.avg) * 100).toFixed(1) : "0";
  const A = snapshots.find((s) => s.id === a), B = snapshots.find((s) => s.id === b);
  const axis = { tick: { fill: "var(--muted-foreground)", fontSize: 10 } };
  return <div className="space-y-4">
    <div className="flex flex-wrap items-end gap-2">{canSave && <><input className={`${field} w-40`} value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} aria-label="Snapshot label" /><Button size="sm" onClick={() => { onSave(label.trim() || "Snapshot"); setLabel(`Wk ${snapshots.length + 2}`); }}>Save current snapshot</Button></>}
      <span className="ml-auto text-sm">Improvement since first snapshot: <b className="font-mono text-primary">{improve}%</b></span></div>
    {!snapshots.length ? <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No snapshots yet — save one to start tracking.</p> : <>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-60"><p className="mb-1 text-xs text-muted-foreground">Average risk score & critical assets</p><ResponsiveContainer><LineChart data={data}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="label" {...axis} /><YAxis {...axis} /><Tooltip {...chartTip} /><Legend />
          <Line dataKey="avg" name="Avg risk" stroke="var(--primary)" strokeWidth={2} /><Line dataKey="critical_count" name="Critical" stroke="var(--tier-critical)" strokeWidth={2} /></LineChart></ResponsiveContainer></div>
        <div className="h-60"><p className="mb-1 text-xs text-muted-foreground">Weekly risk distribution</p><ResponsiveContainer><BarChart data={data}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="label" {...axis} /><YAxis {...axis} /><Tooltip {...chartTip} /><Legend />
          <Bar stackId="d" dataKey="critical_count" name="Critical" fill="var(--tier-critical)" /><Bar stackId="d" dataKey="high_count" name="High" fill="var(--tier-high)" /><Bar stackId="d" dataKey="medium_count" name="Medium" fill="var(--tier-medium)" /><Bar stackId="d" dataKey="low_count" name="Low" fill="var(--tier-low)" /></BarChart></ResponsiveContainer></div>
      </div>
      {snapshots.some((s) => s.simulated) && <p className="text-[11px] text-tier-medium">Snapshots marked "(simulated)" are preloaded demonstration history, not real assessments.</p>}
      <div className="rounded-md border border-border p-3"><p className="mb-2 font-mono text-xs text-primary">Compare two snapshots</p>
        <div className="grid gap-2 sm:grid-cols-2">{[[a, setA], [b, setB]].map(([v, set], i) => <select key={i} className={field} value={v as string} onChange={(e) => (set as (x: string) => void)(e.target.value)} aria-label={`Snapshot ${i + 1}`}><option value="">Select snapshot…</option>{snapshots.map((s) => <option key={s.id} value={s.id}>{s.label} — {new Date(s.created_at).toLocaleDateString()}</option>)}</select>)}</div>
        {A && B && <table className="mt-3 w-full text-xs"><thead><tr className="text-left text-muted-foreground"><th>Metric</th><th>{A.label}</th><th>{B.label}</th><th>Change</th></tr></thead><tbody>
          {([["Total assets", "total_assets"], ["Average risk", "avg_score"], ["Critical", "critical_count"], ["High", "high_count"], ["Risk reduction %", "risk_reduction"]] as const).map(([l, k]) => { const x = Number(A[k]), y = Number(B[k]), d = y - x;
            return <tr key={k} className="border-t border-border/50"><td className="py-1">{l}</td><td className="font-mono">{x}</td><td className="font-mono">{y}</td><td className={`font-mono ${k === "risk_reduction" || k === "total_assets" ? (d >= 0 ? "text-tier-low" : "text-tier-critical") : d <= 0 ? "text-tier-low" : "text-tier-critical"}`}>{d > 0 ? "+" : ""}{d.toFixed(1)}</td></tr>; })}</tbody></table>}
      </div></>}
  </div>;
}
