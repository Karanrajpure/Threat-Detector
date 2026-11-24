import { useState } from "react";
import { DEFAULT_CVSS, cvssScore, cvssSeverity, cvssVector, explainCvss, parseCvssVector, type Cvss } from "@/lib/scoring";
import { toast } from "sonner";
const OPTS: { k: keyof Cvss; label: string; v: [string, string][] }[] = [
  { k: "AV", label: "Attack Vector (AV)", v: [["N", "Network"], ["A", "Adjacent"], ["L", "Local"], ["P", "Physical"]] },
  { k: "AC", label: "Attack Complexity (AC)", v: [["L", "Low"], ["H", "High"]] },
  { k: "PR", label: "Privileges Required (PR)", v: [["N", "None"], ["L", "Low"], ["H", "High"]] },
  { k: "UI", label: "User Interaction (UI)", v: [["N", "None"], ["R", "Required"]] },
  { k: "S", label: "Scope (S)", v: [["U", "Unchanged"], ["C", "Changed"]] },
  { k: "C", label: "Confidentiality (C)", v: [["N", "None"], ["L", "Low"], ["H", "High"]] },
  { k: "I", label: "Integrity (I)", v: [["N", "None"], ["L", "Low"], ["H", "High"]] },
  { k: "A", label: "Availability (A)", v: [["N", "None"], ["L", "Low"], ["H", "High"]] },
];
const SEV_CLS = { None: "text-muted-foreground", Low: "text-tier-low", Medium: "text-tier-medium", High: "text-tier-high", Critical: "text-tier-critical" } as const;
export function CvssPanel({ value, onChange, disabled }: { value?: Cvss | null | undefined; onChange: (c: Cvss | null, score?: number) => void; disabled?: boolean }) {
  const [vec, setVec] = useState("");
  const advanced = !!value;
  return <div className="space-y-2 rounded-md border border-border p-3">
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">Vulnerability input</span>
      <div className="flex rounded-md border border-border p-0.5 text-[11px]" role="radiogroup" aria-label="CVSS mode">
        <button role="radio" aria-checked={!advanced} disabled={disabled} onClick={() => onChange(null)} className={`rounded px-2 py-0.5 ${!advanced ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Manual</button>
        <button role="radio" aria-checked={advanced} disabled={disabled} onClick={() => !advanced && onChange(DEFAULT_CVSS, cvssScore(DEFAULT_CVSS))} className={`rounded px-2 py-0.5 ${advanced ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>CVSS v3.1</button>
      </div>
    </div>
    {value && (() => { const s = cvssScore(value), sev = cvssSeverity(s); const set = (k: keyof Cvss, v: string) => { const n = { ...value, [k]: v } as Cvss; onChange(n, cvssScore(n)); };
      return <>
        <div className="flex items-baseline justify-between"><span className="font-mono text-xs text-muted-foreground">CVSS base score</span><span className={`font-mono text-2xl font-semibold ${SEV_CLS[sev]}`}>{s.toFixed(1)} <span className="text-xs">{sev}</span></span></div>
        {OPTS.map((o) => <div key={o.k} className="flex flex-wrap items-center justify-between gap-1"><span className="text-[11px] text-muted-foreground">{o.label}</span>
          <div className="flex gap-1">{o.v.map(([v, l]) => <button key={v} disabled={disabled} aria-pressed={value[o.k] === v} onClick={() => set(o.k, v)} className={`rounded border px-1.5 py-0.5 text-[11px] ${value[o.k] === v ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}>{l}</button>)}</div></div>)}
        <code className="block break-all rounded bg-background p-1.5 text-[10px] text-primary">{cvssVector(value)}</code>
        <p className="text-[11px] leading-relaxed text-muted-foreground">{explainCvss(value)} The Threat Detector vulnerability rating is set from this base score.</p>
        <form className="flex gap-1" onSubmit={(e) => { e.preventDefault(); const p = parseCvssVector(vec); if (!p) return void toast.error("Not a valid CVSS:3.1 vector"); onChange(p, cvssScore(p)); setVec(""); }}>
          <input value={vec} onChange={(e) => setVec(e.target.value)} placeholder="Paste CVSS:3.1/AV:N/…" disabled={disabled} className="flex-1 rounded border border-input bg-background px-2 py-1 font-mono text-[10px]" aria-label="Paste CVSS vector" />
          <button className="rounded border border-border px-2 text-[11px] text-muted-foreground" disabled={disabled}>Load</button></form>
      </>; })()}
  </div>;
}
