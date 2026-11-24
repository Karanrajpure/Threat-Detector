import type { Database } from "@/integrations/supabase/types";
import { isValidCvss, type Asset, type Control, type Exposure } from "./scoring";
export type AssetRow = Database["public"]["Tables"]["assets"]["Row"];
export type WsRole = Database["public"]["Enums"]["workspace_role"];
export type SnapshotRow = Database["public"]["Tables"]["snapshots"]["Row"];
export type ActivityRow = Database["public"]["Tables"]["activity_log"]["Row"];
export function activityActor(userId: string | null, members: { user_id: string; display_name: string; email: string | null }[]) {
  if (!userId) return { name: "System", email: null };
  const member = members.find((m) => m.user_id === userId);
  return member ? { name: member.display_name || member.email || "Member", email: member.email } : { name: "Former or unavailable member", email: null };
}
export function rowToAsset(r: AssetRow): Asset {
  return { id: r.id, name: r.name, scenario: r.scenario, type: r.type, vulnerability: Number(r.vulnerability), criticality: r.criticality,
    exposure: r.exposure as Exposure, controls: (r.controls ?? []) as Control[], links: r.links ?? [], cvss: isValidCvss(r.cvss) ? r.cvss : null };
}
export const ROLE_LABEL: Record<WsRole, string> = { owner: "Owner", admin: "Admin", analyst: "Analyst", viewer: "Viewer" };
export const canEdit = (r?: WsRole | null) => r === "owner" || r === "admin" || r === "analyst";
export const canManage = (r?: WsRole | null) => r === "owner" || r === "admin";
