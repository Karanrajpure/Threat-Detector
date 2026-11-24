import { useMemo, useState } from "react";
import { Background, Controls, MarkerType, ReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { attackPaths, edges as topo, GATEWAY, riskScore, riskTier, cvssScore, type Asset } from "@/lib/scoring";
import { TIER_VAR } from "./ui";

const COL: Record<string, number> = { [GATEWAY]: 0, internet: 1, campus: 2, internal: 3, isolated: 4 };
export function AttackFlow({ assets, selected, onSelect, height = 520, interactive = true }: { assets: Asset[]; selected?: string | undefined; onSelect?: (id: string) => void; height?: number; interactive?: boolean }) {
  const [relevantOnly, setRelevantOnly] = useState(false);
  const { nodes, edges, paths } = useMemo(() => {
    const paths = attackPaths(assets);
    const hot = new Set<string>(); const onPath = new Set<string>();
    for (const p of paths) { p.forEach((n) => onPath.add(n)); for (let i = 0; i < p.length - 1; i++) hot.add(`${p[i]}>${p[i + 1]}`); }
    const rows: Record<number, number> = {};
    const mk = (id: string, label: string, col: number, color: string, sub: string, ring: boolean): Node => {
      const r = rows[col] = (rows[col] ?? -1) + 1;
      return { id, position: { x: col * 230, y: r * 92 + (col === 0 ? 160 : 0) }, data: { label: <div className="text-left"><div className="truncate text-[11px] font-semibold">{label}</div><div className="text-[9px] opacity-70">{sub}</div></div> },
        style: { background: "var(--card)", color: "var(--foreground)", border: `2px solid ${color}`, borderRadius: 8, width: 180, padding: 6, boxShadow: ring ? `0 0 0 3px ${color}55` : undefined, opacity: relevantOnly && !onPath.has(id) ? 0.15 : 1 } };
    };
    const nodes: Node[] = [mk(GATEWAY, "🌐 Internet gateway", 0, "var(--foreground)", "Simulated entry point", false)];
    for (const a of [...assets].sort((x, y) => COL[x.exposure]! - COL[y.exposure]!)) { const s = riskScore(a); nodes.push(mk(a.id, a.name, COL[a.exposure]!, TIER_VAR[riskTier(s)], `${a.type} · risk ${s}`, a.id === selected)); }
    const edges: Edge[] = topo(assets).map(([s, t]) => { const h = hot.has(`${s}>${t}`); return {
      id: `${s}>${t}`, source: s, target: t, animated: h, markerEnd: { type: MarkerType.ArrowClosed, color: h ? "var(--tier-critical)" : "var(--muted-foreground)" },
      style: { stroke: h ? "var(--tier-critical)" : "var(--muted-foreground)", strokeWidth: h ? 2.5 : 1, opacity: relevantOnly && !h ? 0.08 : h ? 1 : 0.5 } }; });
    return { nodes, edges, paths };
  }, [assets, selected, relevantOnly]);
  const sel = assets.find((a) => a.id === selected);
  return <div className="space-y-2">
    {interactive && <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
      <label className="flex items-center gap-2 text-muted-foreground"><input type="checkbox" checked={relevantOnly} onChange={(e) => setRelevantOnly(e.target.checked)} className="accent-primary" />Show only attack-path relevant nodes</label>
      <span className="text-muted-foreground">{paths.length} simulated path(s) to criticality-5 assets</span></div>}
    <div style={{ height }} className="overflow-hidden rounded-md border border-border bg-background">
      <ReactFlow nodes={nodes} edges={edges} fitView nodesDraggable={interactive} panOnDrag zoomOnScroll={interactive} proOptions={{ hideAttribution: true }}
        onNodeClick={(_, n) => n.id !== GATEWAY && onSelect?.(n.id)}>
        <Background color="var(--border)" gap={24} />{interactive && <Controls showInteractive={false} />}
      </ReactFlow>
    </div>
    {interactive && sel && <div className="rounded-md border border-border p-3 text-xs"><span className="font-semibold">{sel.name}</span> · {sel.type} · {sel.exposure} · vulnerability {sel.vulnerability}/10{sel.cvss ? ` · CVSS ${cvssScore(sel.cvss)}` : ""} · risk {riskScore(sel)} · connects to {sel.links.length} asset(s)</div>}
    <p className="text-[11px] text-muted-foreground">Arrows show which asset can reach which in the configured lab topology. Red animated edges are simulated attack routes from entry points toward critical assets — they do not prove real exploitability.</p>
  </div>;
}
