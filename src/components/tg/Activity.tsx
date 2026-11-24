import { useState } from "react";
import { activityActor, type ActivityRow } from "@/lib/db";
import type { Member } from "@/hooks/use-workspace";
import { Button } from "@/components/ui/button";
const fmt = (v: unknown) => v == null ? "—" : Array.isArray(v) ? (v.length ? v.join(", ") : "none") : typeof v === "object" ? JSON.stringify(v) : String(v);
export function Activity({ rows, members, assetsById }: { rows: ActivityRow[]; members: Member[]; assetsById: Map<string, string> }) {
  const [additionsOnly, setAdditionsOnly] = useState(false);
  if (!rows.length) return <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No activity yet.</p>;
  const visible = additionsOnly ? rows.filter((r) => r.action === "created") : rows;
  const val = (f: string | null, v: unknown) => f === "links" && Array.isArray(v) ? fmt(v.map((x) => assetsById.get(String(x)) ?? "removed asset")) : f === "cvss" ? (v ? "set" : "manual") : fmt(v);
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-2" aria-label="Activity filters">
      <Button size="sm" variant={!additionsOnly ? "default" : "outline"} aria-pressed={!additionsOnly} onClick={() => setAdditionsOnly(false)}>All activity</Button>
      <Button size="sm" variant={additionsOnly ? "default" : "outline"} aria-pressed={additionsOnly} onClick={() => setAdditionsOnly(true)}>Asset additions</Button>
      <span className="ml-auto text-xs text-muted-foreground">{visible.length} records · latest 300</span>
    </div>
    <div className="max-h-[480px] overflow-auto"><table className="w-full text-xs"><thead className="sticky top-0 bg-card text-left text-muted-foreground"><tr><th className="px-2 py-2">Date & time</th><th className="px-2 py-2">Added / changed by</th><th className="px-2 py-2">Action</th><th className="px-2 py-2">Asset</th><th className="px-2 py-2">Previous</th><th className="px-2 py-2">New</th></tr></thead>
      <tbody>{visible.map((r) => { const actor = activityActor(r.user_id, members); return <tr key={r.id} className="border-t border-border/50 align-top">
        <td className="whitespace-nowrap px-2 py-3 font-mono text-muted-foreground"><time dateTime={r.created_at}>{new Date(r.created_at).toLocaleString()}</time></td>
        <td className="min-w-40 px-2 py-3"><div className="font-medium">{actor.name}</div>{actor.email && actor.email !== actor.name && <div className="mt-1 break-all text-muted-foreground">{actor.email}</div>}</td>
        <td className="whitespace-nowrap px-2 py-3">{r.action === "created" ? "Added asset" : r.action === "deleted" ? "Deleted asset" : r.action}{r.field ? ` ${r.field}` : ""}</td><td className="min-w-32 px-2 py-3">{r.asset_name ?? "—"}</td>
        <td className="max-w-[160px] truncate px-2 py-3 text-tier-critical" title={val(r.field, r.old_value)}>{r.action === "updated" ? val(r.field, r.old_value) : "—"}</td><td className="max-w-[160px] truncate px-2 py-3 text-tier-low" title={val(r.field, r.new_value)}>{r.action === "updated" ? val(r.field, r.new_value) : "—"}</td></tr>; })}
        {!visible.length && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No asset additions in the latest activity.</td></tr>}
      </tbody></table></div>
    </div>;
}
