import { lazy, Suspense, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const CyberScene = lazy(() => import("./CyberScene"));

function webgl() { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; } }

/** Fixed, non-interactive 3D backdrop. Falls back to a static gradient without WebGL. */
export function CyberBackdrop({ subtle, className }: { subtle?: boolean | undefined; className?: string | undefined }) {
  const [env, setEnv] = useState<{ gl: boolean; reduced: boolean; mobile: boolean } | null>(null);
  useEffect(() => { setEnv({ gl: webgl(), reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches, mobile: window.matchMedia("(max-width: 768px)").matches }); }, []);
  return <div aria-hidden className={cn("cyber-backdrop pointer-events-none fixed inset-0 -z-10", subtle && "opacity-45", className)}>
    <div className="cyber-fallback absolute inset-0" />
    {env?.gl && <Suspense fallback={null}><div className="absolute inset-0 animate-in fade-in duration-1000"><CyberScene subtle={subtle} reduced={env.reduced} mobile={env.mobile} /></div></Suspense>}
    {subtle && <div className="absolute inset-0 cyber-veil" />}
  </div>;
}
