import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { CyberBackdrop } from "@/components/three/CyberBackdrop";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Threat Detector — Cyber Lab Risk Intelligence" },
      { name: "description", content: "Team workspaces for scoring lab vulnerability exposure with CVSS v3.1, attack paths and mitigation simulation." },
      { property: "og:title", content: "Threat Detector — Cyber Lab Risk Intelligence" },
      { property: "og:description", content: "Collaborative lab risk scoring for cybersecurity coursework teams." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Landing,
});
const FEATURES = [
  ["Official CVSS v3.1", "Base scores and vector strings per the FIRST specification."],
  ["Live team workspaces", "Edits sync instantly with roles, presence and an immutable audit trail."],
  ["Attack path graph", "Directional topology highlights simulated routes to critical assets."],
  ["What-if simulator", "Model patching, segmentation, MFA, EDR and NAC as residual risk."],
  ["AI risk analyst", "Structured reports with MITRE ATT&CK mappings from your real data."],
  ["Reports & presentation", "PDF/CSV exports and a projector-ready demo mode."],
];
const SECTIONS = [
  ["platform", "Platform", "One shared workspace for every lab asset.", "Roles, presence and an immutable audit trail keep coursework teams in sync — no more broken spreadsheet formulas.", [0, 1]],
  ["analytics", "Risk analytics", "Scores that move the moment you do.", "Official CVSS v3.1 vectors feed a Threat Detector risk score and a 5×5 likelihood × impact heatmap, recalculated live.", [5]],
  ["surface", "Attack surface", "See how an attacker would walk your lab.", "A directional topology highlights simulated routes from exposed entry points to your most critical assets.", [2]],
  ["mitigation", "Mitigation", "Turn red nodes into protected ones.", "Model patching, segmentation, MFA, EDR and NAC and watch residual risk fall before you change a thing.", [3, 4]],
] as const;
function Landing() {
  return <div className="relative isolate min-h-screen font-sans">
    <CyberBackdrop />
    <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-5 backdrop-blur-sm"><span className="font-mono text-xl font-semibold text-primary">Threat Detector_</span>
      <nav className="flex items-center gap-4"><Link to="/about" className="text-sm text-muted-foreground hover:text-foreground">About</Link><Button asChild variant="outline" size="sm"><Link to="/auth" search={{ redirect: undefined, mode: undefined }}>Sign in</Link></Button></nav></header>
    <main className="mx-auto max-w-6xl px-6">
      <section className="flex min-h-[85vh] flex-col justify-center pb-20">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Cyber lab risk intelligence · coursework edition</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight sm:text-6xl">Know which lab asset breaks first — <span className="text-primary">before the attacker does.</span></h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">Threat Detector replaces fragile spreadsheet formulas with a shared, real-time workspace for evaluating vulnerability exposure across campus cybersecurity labs.</p>
        <div className="mt-8 flex flex-wrap gap-3"><Button asChild size="lg"><Link to="/demo">Try it now — no sign-up</Link></Button><Button asChild size="lg" variant="outline"><Link to="/workspaces">Open my team workspaces</Link></Button></div>
      </section>
      {SECTIONS.map(([id, kicker, title, body, feats], i) => <section key={id} id={id} className={`flex min-h-screen items-center ${i % 2 ? "justify-start" : "justify-end"}`}>
        <div className="max-w-md rounded-xl border border-border bg-card/80 p-7 backdrop-blur-md shadow-terminal">
          <p className="font-mono text-xs uppercase tracking-widest text-primary">0{i + 1} · {kicker}</p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight">{title}</h2>
          <p className="mt-3 text-muted-foreground">{body}</p>
          <ul className="mt-5 space-y-3">{feats.map((f) => <li key={f} className="border-l-2 border-primary/60 pl-3"><div className="font-mono text-sm text-primary">// {FEATURES[f]?.[0]}</div><div className="text-sm text-muted-foreground">{FEATURES[f]?.[1]}</div></li>)}</ul>
        </div>
      </section>)}
      <section className="flex min-h-screen flex-col items-center justify-center text-center">
        <h2 className="max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl">Every asset. Every path. <span className="text-primary">One connected picture.</span></h2>
        <div className="mt-8 flex flex-wrap justify-center gap-3"><Button asChild size="lg"><Link to="/demo">Explore the live demo</Link></Button><Button asChild size="lg" variant="outline"><Link to="/auth" search={{ redirect: undefined, mode: undefined }}>Create a team workspace</Link></Button></div>
        <p className="mt-16 text-xs text-muted-foreground">Built for coursework teams at Middlesex University Dubai. Independent student project — not endorsed or certified by the university.</p>
      </section>
    </main>
  </div>;
}
