import { useEffect, useState } from "react";
const STEPS: [string, string][] = [
  ["Welcome to Threat Detector", "Your team's shared workspace for scoring lab vulnerability exposure. Every edit syncs live to teammates."],
  ["Edit assets on the left", "Pick an asset, set its vulnerability manually or with the official CVSS v3.1 calculator, then adjust criticality and network exposure."],
  ["Explore results on the right", "Tabs show the impact chart, heatmap, attack-path graph, what-if simulator, AI analyst, trends, team and activity history."],
  ["Three separate numbers", "CVSS = official severity. Risk score = Threat Detector's weighted exploit score. Residual = risk after simulated mitigations."],
  ["Shortcuts", "Ctrl/⌘+K search · N new asset · J/K next/previous · R reset simulation · P presentation · ? this tour · Esc close"],
];
export function Tour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [i, setI] = useState(0);
  useEffect(() => { if (open) setI(0); }, [open]);
  if (!open) return null;
  const [t, d] = STEPS[i] ?? STEPS[0]!;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="tour-title">
    <div className="w-full max-w-md rounded-lg border border-primary bg-card p-6 animate-in zoom-in-95 fade-in">
      <div className="flex gap-1">{STEPS.map((_, j) => <span key={j} className={`h-1 flex-1 rounded ${j <= i ? "bg-primary" : "bg-muted"}`} />)}</div>
      <h3 id="tour-title" className="mt-4 text-lg font-semibold text-primary">{t}</h3><p className="mt-2 text-sm text-muted-foreground">{d}</p>
      <div className="mt-5 flex justify-between"><button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">Skip</button>
        <div className="flex gap-2">{i > 0 && <button onClick={() => setI(i - 1)} className="rounded border border-border px-3 py-1.5 text-sm">Back</button>}
          <button autoFocus onClick={() => (i < STEPS.length - 1 ? setI(i + 1) : onClose())} className="rounded bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground">{i < STEPS.length - 1 ? "Next" : "Start"}</button></div></div>
    </div></div>;
}
