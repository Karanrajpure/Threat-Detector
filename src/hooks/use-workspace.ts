import type { Database } from "@/integrations/supabase/types";
import { useEffect, useMemo, useRef, useState } from "react";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { rowToAsset, type ActivityRow, type SnapshotRow, type WsRole } from "@/lib/db";
import { labStats, riskScore, riskTier, validateAsset, type Asset } from "@/lib/scoring";

export interface Member { user_id: string; role: WsRole; display_name: string; email: string | null }

export const wsQuery = (id: string) => queryOptions({
  queryKey: ["ws", id],
  queryFn: async () => {
    const { data, error } = await supabase.from("workspaces").select("*").eq("id", id).maybeSingle();
    if (error) throw error; if (!data) throw new Error("Workspace not found or you are not a member");
    return data;
  },
});
export const assetsQuery = (id: string) => queryOptions({
  queryKey: ["ws", id, "assets"],
  queryFn: async () => {
    const { data, error } = await supabase.from("assets").select("*").eq("workspace_id", id).order("sort_order").order("created_at");
    if (error) throw error; return (data ?? []).map(rowToAsset);
  },
});
export const membersQuery = (id: string) => queryOptions({
  queryKey: ["ws", id, "members"],
  queryFn: async (): Promise<Member[]> => {
    const { data: m, error } = await supabase.from("workspace_members").select("user_id, role").eq("workspace_id", id);
    if (error) throw error;
    const ids = (m ?? []).map((x) => x.user_id);
    const { data: p } = ids.length ? await supabase.from("profiles").select("id, display_name, email").in("id", ids) : { data: [] };
    return (m ?? []).map((x) => { const pr = p?.find((y) => y.id === x.user_id); return { ...x, display_name: pr?.display_name || pr?.email || "Member", email: pr?.email ?? null }; });
  },
});
export const snapshotsQuery = (id: string) => queryOptions({
  queryKey: ["ws", id, "snapshots"],
  queryFn: async (): Promise<SnapshotRow[]> => { const { data, error } = await supabase.from("snapshots").select("*").eq("workspace_id", id).order("created_at"); if (error) throw error; return data ?? []; },
});
export const activityQuery = (id: string) => queryOptions({
  queryKey: ["ws", id, "activity"],
  queryFn: async (): Promise<ActivityRow[]> => { const { data, error } = await supabase.from("activity_log").select("*").eq("workspace_id", id).order("created_at", { ascending: false }).limit(300); if (error) throw error; return data ?? []; },
});

/** Realtime sync + presence for one workspace. */
export function useWorkspaceRealtime(id: string, me: { id: string; name: string }) {
  const qc = useQueryClient();
  const [online, setOnline] = useState<{ user_id: string; name: string }[]>([]);
  useEffect(() => {
    const filter = `workspace_id=eq.${id}`;
    const ch = supabase.channel(`ws-db-${id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "assets", filter }, () => qc.invalidateQueries({ queryKey: ["ws", id, "assets"] }))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_log", filter }, () => qc.invalidateQueries({ queryKey: ["ws", id, "activity"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "snapshots", filter }, () => qc.invalidateQueries({ queryKey: ["ws", id, "snapshots"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "workspace_members", filter }, () => qc.invalidateQueries({ queryKey: ["ws", id, "members"] }))
      .subscribe();
    const pres = supabase.channel(`presence-ws-${id}`, { config: { presence: { key: me.id } } });
    pres.on("presence", { event: "sync" }, () => {
      const st = pres.presenceState<{ user_id: string; name: string }>();
      setOnline(Object.values(st).map((v) => v[0]!).filter(Boolean));
    }).subscribe((s) => { if (s === "SUBSCRIBED") pres.track({ user_id: me.id, name: me.name }); });
    return () => { supabase.removeChannel(ch); supabase.removeChannel(pres); };
  }, [id, me.id, me.name, qc]);
  return online;
}

/** Debounced, optimistic asset writes. Each field change lands in the immutable activity log via a DB trigger. */
export function useAssetMutations(wsId: string) {
  const qc = useQueryClient();
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const pending = useRef(new Map<string, Partial<Asset>>());
  const key = ["ws", wsId, "assets"];
  return useMemo(() => {
    const flush = async (id: string) => {
      const patch = pending.current.get(id); pending.current.delete(id); if (!patch) return;
      const { error } = await supabase.from("assets").update(patch as Database["public"]["Tables"]["assets"]["Update"]).eq("id", id);
      if (error) { toast.error(`Save failed: ${error.message}`); qc.invalidateQueries({ queryKey: key }); }
    };
    return {
      update(id: string, patch: Partial<Asset>, delay = 450) {
        const err = validateAsset(patch); if (err) { toast.error(err); return; }
        qc.setQueryData<Asset[]>(key, (xs) => xs?.map((a) => (a.id === id ? { ...a, ...patch } : a)));
        pending.current.set(id, { ...pending.current.get(id), ...patch });
        clearTimeout(timers.current.get(id));
        timers.current.set(id, setTimeout(() => flush(id), delay));
      },
      async create(): Promise<string | null> {
        const { data, error } = await supabase.from("assets").insert({ workspace_id: wsId, name: "New lab asset", scenario: "Unassigned", type: "Linux server", sort_order: 999 }).select("id").single();
        if (error) { toast.error(error.message); return null; }
        await qc.invalidateQueries({ queryKey: key }); toast.success("Asset added"); return data.id;
      },
      async remove(id: string) {
        const { error } = await supabase.from("assets").delete().eq("id", id);
        if (error) return void toast.error(error.message);
        qc.setQueryData<Asset[]>(key, (xs) => xs?.filter((a) => a.id !== id)); toast.success("Asset deleted");
      },
      async snapshot(assets: Asset[], label: string, userId: string) {
        const s = labStats(assets);
        const c = (t: string) => assets.filter((a) => riskTier(riskScore(a)) === t).length;
        const { error } = await supabase.from("snapshots").insert({ workspace_id: wsId, created_by: userId, label, total_assets: assets.length, avg_score: s.avgRisk,
          critical_count: c("Critical"), high_count: c("High"), medium_count: c("Medium"), low_count: c("Low"), risk_reduction: s.reduction });
        if (error) return void toast.error(error.message);
        qc.invalidateQueries({ queryKey: ["ws", wsId, "snapshots"] }); toast.success(`Snapshot "${label}" saved`);
      },
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsId, qc]);
}

export function useAuthUser() {
  return useQuery({ queryKey: ["me"], queryFn: async () => {
    const { data } = await supabase.auth.getUser(); const u = data.user; if (!u) return null;
    const { data: p } = await supabase.from("profiles").select("display_name").eq("id", u.id).maybeSingle();
    return { id: u.id, email: u.email ?? "", name: p?.display_name || u.email?.split("@")[0] || "You" };
  } });
}
