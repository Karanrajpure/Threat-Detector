import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ProviderButtons } from "@/components/tg/ProviderButtons";
import { field, L } from "@/components/tg/ui";

const safe = (p: unknown) => { if (typeof p !== "string") return "/workspaces"; try { const u = new URL(p, "http://x"); return u.pathname.startsWith("/") && !u.pathname.startsWith("//") ? u.pathname + u.search : "/workspaces"; } catch { return "/workspaces"; } };

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string | undefined; mode?: "up" | undefined } => ({ redirect: typeof s["redirect"] === "string" ? s["redirect"] : undefined, mode: s["mode"] === "up" ? "up" : undefined }),
  head: () => ({ meta: [{ title: "Sign in — Threat Detector" }, { name: "description", content: "Sign in to your Threat Detector team workspace." }, { property: "og:title", content: "Sign in — Threat Detector" }, { property: "og:description", content: "Access your cyber lab risk workspace." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { redirect, mode: initialMode } = Route.useSearch();
  const next = safe(redirect);
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up" | "forgot">(initialMode ?? "in");
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [name, setName] = useState("");
  const [busy, setBusy] = useState(false); const [sent, setSent] = useState<string | null>(null);

  useEffect(() => {
    const go = () => { const n = sessionStorage.getItem("tg-next") ?? next; sessionStorage.removeItem("tg-next"); navigate({ to: safe(n) }); };
    supabase.auth.getUser().then(({ data }) => { if (data.user) go(); });
    const { data } = supabase.auth.onAuthStateChange((e) => { if (e === "SIGNED_IN") go(); });
    return () => data.subscription.unsubscribe();
  }, [navigate, next]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return void toast.error("Enter a valid email");
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error; setSent("Check your email for a password reset link.");
      } else if (mode === "up") {
        if (pw.length < 8) throw new Error("Password must be at least 8 characters");
        if (name.trim().length < 2) throw new Error("Enter your name");
        const { data, error } = await supabase.auth.signUp({ email, password: pw, options: { emailRedirectTo: window.location.origin + "/auth", data: { display_name: name.trim() } } });
        if (error) throw error;
        if (!data.session) setSent("Check your email to confirm your account, then sign in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
      }
    } catch (err) { toast.error(err instanceof Error ? err.message : "Something went wrong"); }
    finally { setBusy(false); }
  }

  return <div className="grid min-h-screen place-items-center grid-bg p-4 font-sans">
    <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-terminal">
      <h1 className="font-mono text-2xl font-semibold text-primary">Threat Detector_</h1>
      <p className="mb-5 text-sm text-muted-foreground">{mode === "up" ? "Create your student account" : mode === "forgot" ? "Reset your password" : "Sign in to your team workspace"}</p>
      {sent ? <p role="status" className="rounded-md border border-primary p-3 text-sm text-primary">{sent}</p> : <>
        {mode !== "forgot" && <><ProviderButtons next={next} /><div className="my-4 flex items-center gap-2 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div></>}
        <form onSubmit={submit} className="space-y-3">
          {mode === "up" && <L t="Your name"><input className={field} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></L>}
          <L t="Email"><input className={field} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></L>
          {mode !== "forgot" && <L t="Password"><input className={field} type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete={mode === "up" ? "new-password" : "current-password"} required /></L>}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Please wait…" : mode === "up" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}</Button>
        </form>
      </>}
      <div className="mt-4 flex justify-between text-xs text-muted-foreground">
        {mode === "in" ? <><button onClick={() => setMode("up")} className="hover:text-primary">Create account</button><button onClick={() => setMode("forgot")} className="hover:text-primary">Forgot password?</button></>
          : <button onClick={() => { setMode("in"); setSent(null); }} className="hover:text-primary">← Back to sign in</button>}
      </div>
    </div>
  </div>;
}
