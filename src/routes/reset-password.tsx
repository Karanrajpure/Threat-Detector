import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { field, L } from "@/components/tg/ui";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — Threat Detector" }, { name: "description", content: "Choose a new Threat Detector password." }, { property: "og:title", content: "Reset password — Threat Detector" }, { property: "og:description", content: "Choose a new password." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Reset,
});
function Reset() {
  const [pw, setPw] = useState(""); const [busy, setBusy] = useState(false); const navigate = useNavigate();
  async function save(e: React.FormEvent) {
    e.preventDefault(); if (pw.length < 8) return void toast.error("Password must be at least 8 characters");
    setBusy(true); const { error } = await supabase.auth.updateUser({ password: pw }); setBusy(false);
    if (error) return void toast.error(error.message); toast.success("Password updated"); navigate({ to: "/workspaces" });
  }
  return <div className="grid min-h-screen place-items-center grid-bg p-4 font-sans"><form onSubmit={save} className="w-full max-w-sm space-y-3 rounded-lg border border-border bg-card p-6">
    <h1 className="font-mono text-xl text-primary">Set a new password</h1>
    <L t="New password"><input className={field} type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></L>
    <Button type="submit" className="w-full" disabled={busy}>Save password</Button></form></div>;
}
