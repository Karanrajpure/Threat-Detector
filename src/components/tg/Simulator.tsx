import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CONTROL_INFO, CONTROLS, labStats, residualScore, riskScore, type Asset, type Control, type MitigationModel } from "@/lib/scoring";
import { Button } from "@/components/ui/button";
import { Stat } from "./ui";
export const chartTip = { contentStyle: { background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)", borderRadius: 6 }, cursor: { fill: "var(--muted)" } };

export function Simulator({ assets, sim, setSim, model, setModel, selected, canApply, onApply, onReset }: {
  assets: Asset[]; sim: Record<string, Control[]>; setSim: (id: string, c: Control[]) => void; model: MitigationModel; setModel: (m: MitigationModel) => void;
  selected?: Asset | undefined; canApply: boolean; onApply: () => void; onReset: () => void;
}) {
  const ctl = (a: Asset) => sim[a.id] ?? a.controls;
  const st = labStats(assets, ctl, model);
  const data = assets.map((a) => ({ name: a.name, risk: riskScore(a), residual: residualScore(a, ctl(a), model) })).sort((x, y) => y.risk - x.risk);
  const changed = assets.filter((a) => (sim[a.id] ?? a.controls).slice().sort().join() !== a.controls.slice().sort().join()).length;
  return <div className="space-y-4">
    {selected && <div className="rounded-md border border-border p-3"><div className="mb-2 text-sm">Simulate controls for <span className="font-semibold text-primary">{selected.name}</span></div>
      <div className="flex flex-wrap gap-2">{CONTROLS.map((c) => { const on = ctl(selected).includes(c);
        return <button key={c} aria-pressed={on} title={CONTROL_INFO[c].assumption(model)} onClick={() => setSim(selected.id, on ? ctl(selected).filter((x) => x !== c) : [...ctl(selected), c])}
          className={`rounded-full border px-3 py-1 text-xs transition-colors ${on ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}>{on ? "✓ " : ""}{CONTROL_INFO[c].label}</button>; })}</div>
      <div className="mt-2 font-mono text-xs text-muted-foreground">risk {riskScore(selected)} → residual <span className="text-primary">{residualScore(selected, ctl(selected), model)}</span></div></div>}
    <div className="grid grid-cols-3 gap-3"><Stat label="Avg risk (original)" value={st.avgRisk.toFixed(1)} /><Stat label="Avg residual" value={st.avgResidual.toFixed(1)} cls="text-primary border-primary" /><Stat label="Lab risk reduction" value={`${st.reduction}%`} cls="text-primary border-primary" /></div>
    <div className="h-72"><ResponsiveContainer><BarChart data={data} margin={{ bottom: 70 }}><CartesianGrid stroke="var(--border)" vertical={false} />
      <XAxis dataKey="name" angle={-40} textAnchor="end" interval={0} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} /><YAxis domain={[0, 100]} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
      <Tooltip {...chartTip} /><Legend verticalAlign="top" /><Bar dataKey="risk" name="Original risk" fill="var(--muted-foreground)" radius={[3, 3, 0, 0]} /><Bar dataKey="residual" name="Residual risk" fill="var(--primary)" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div>
    <details className="rounded-md border border-border p-3 text-xs"><summary className="cursor-pointer font-mono text-primary">Mitigation model assumptions (editable)</summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {(["patch", "mfa", "edr", "nac"] as const).map((k) => <label key={k} className="space-y-1"><span className="text-muted-foreground">{CONTROL_INFO[k].label}: ×{model[k]}</span>
          <input type="range" min={0.1} max={1} step={0.05} value={model[k]} onChange={(e) => setModel({ ...model, [k]: +e.target.value })} className="w-full accent-primary" /></label>)}
        <label className="space-y-1"><span className="text-muted-foreground">Segmentation: −{model.segmentationSteps} exposure level(s)</span>
          <input type="range" min={1} max={3} step={1} value={model.segmentationSteps} onChange={(e) => setModel({ ...model, segmentationSteps: +e.target.value })} className="w-full accent-primary" /></label>
      </div>
      <ul className="mt-3 list-disc space-y-0.5 pl-4 text-muted-foreground">{CONTROLS.map((c) => <li key={c}>{CONTROL_INFO[c].label}: {CONTROL_INFO[c].assumption(model)}</li>)}</ul>
      <p className="mt-2 text-muted-foreground">Educational model only. It never changes official CVSS scores or the original Threat Detector risk score.</p></details>
    <div className="flex flex-wrap items-center gap-2"><Button variant="outline" size="sm" onClick={onReset}>Reset simulation (R)</Button>
      {canApply && <Button size="sm" disabled={!changed} onClick={onApply}>Apply plan to {changed} asset(s)</Button>}
      <span className="text-xs text-muted-foreground">Simulation stays local until you apply it.</span></div>
  </div>;
}
