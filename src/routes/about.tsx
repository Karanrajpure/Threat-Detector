import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { CyberBackdrop } from "@/components/three/CyberBackdrop";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Threat Detector — How Lab Risk Scoring Works" },
      { name: "description", content: "What Threat Detector is, who it is for, how its CVSS v3.1 and risk scoring works, and how coursework teams use it to evaluate lab vulnerability exposure." },
      { property: "og:title", content: "About Threat Detector — How Lab Risk Scoring Works" },
      { property: "og:description", content: "The story, scoring model and features behind Threat Detector, a cyber lab risk intelligence workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: About,
});

const PROBLEM = [
  ["Broken formulas", "Shared spreadsheets break when one cell reference shifts, so whole risk registers silently go wrong."],
  ["No shared picture", "Each team member keeps a different copy, and nobody knows which numbers are current."],
  ["Scores without context", "A single number hides why an asset is risky and what would actually lower it."],
];
const STEPS = [
  ["01", "Add your lab assets", "Record each server, workstation, IoT device, router or VM: its name, coursework scenario, type, owner and how critical it is to the lab."],
  ["02", "Rate the vulnerability", "Set a vulnerability rating or build a full CVSS v3.1 vector — attack vector, complexity, privileges, user interaction, scope and impact on confidentiality, integrity and availability."],
  ["03", "Set network exposure", "Choose whether the asset is isolated, internal, on the campus network or reachable from the internet. Exposure strongly changes how likely an attack is."],
  ["04", "Read the results instantly", "Exploit scores, risk tiers, the heatmap, the ranked table and the impact chart all update the moment you change a value."],
  ["05", "Simulate the fix", "Try patching, segmentation, MFA, EDR or network access control and see the residual risk before you change anything in the real lab."],
  ["06", "Report and present", "Export a PDF or CSV report, save trend snapshots and switch to presentation mode for your coursework demo."],
];
const SCORES = [
  ["CVSS v3.1 base score", "The official FIRST formula (0.0–10.0). It describes how severe the vulnerability is on its own, with a standard vector string you can cite in reports."],
  ["Threat Detector risk score", "Combines vulnerability severity, network exposure and asset criticality into a 0–100 score, so an internet-facing critical server ranks above an isolated test VM with the same flaw."],
  ["Risk tier", "Groups each score into Critical, High, Medium or Low so the team knows what to fix first."],
  ["Residual risk", "The risk that remains after the mitigations you select, so you can compare plans fairly."],
];
const FEATURES = [
  ["Team workspaces", "Create a workspace, invite teammates with a join code and edit together in real time. Roles — Owner, Admin, Analyst and Viewer — control who can change what."],
  ["Immutable activity log", "Every change is recorded automatically and cannot be edited, giving a trustworthy audit trail for assessment."],
  ["5×5 risk heatmap", "Plots each asset by likelihood and impact so hotspots are visible at a glance."],
  ["Attack path graph", "A directional network map that highlights simulated routes from exposed entry points to critical assets."],
  ["What-if simulator", "Model mitigations across many assets at once and apply the plan when you're happy."],
  ["AI risk analyst", "Generates a structured report from your real data with priorities and MITRE ATT&CK technique mappings, with a rule-based fallback."],
  ["Trends & snapshots", "Save the state of your lab over time and compare how risk changed between checkpoints."],
  ["Guest demo", "Anyone can explore the full tool with 15 realistic mock lab assets — no sign-up needed."],
];

function About() {
  return <div className="relative isolate min-h-screen font-sans">
    <CyberBackdrop subtle />
    <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-5 backdrop-blur-sm">
      <Link to="/" className="font-mono text-xl font-semibold text-primary">Threat Detector_</Link>
      <nav className="flex items-center gap-3"><Link to="/demo" className="text-sm text-muted-foreground hover:text-foreground">Demo</Link>
        <Button asChild variant="outline" size="sm"><Link to="/auth" search={{ redirect: undefined, mode: undefined }}>Sign in</Link></Button></nav>
    </header>
    <main className="mx-auto max-w-5xl space-y-24 px-6 pb-24 pt-12">
      <section>
        <p className="font-mono text-xs uppercase tracking-widest text-primary">About Threat Detector</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">A risk intelligence workspace for cybersecurity coursework labs.</h1>
        <p className="mt-6 max-w-3xl text-lg text-muted-foreground">Threat Detector helps cybersecurity students at Middlesex University Dubai evaluate how exposed their lab assets are to attack. Instead of fragile spreadsheets, teams get one shared workspace where they enter asset details, rate vulnerabilities, set network exposure and immediately see exploit scores, risk tiers and the paths an attacker might take.</p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">Why we built it</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">{PROBLEM.map(([t, d]) => <div key={t} className="rounded-lg border border-border bg-card/85 p-5 backdrop-blur-md"><h3 className="font-mono text-sm text-primary">// {t}</h3><p className="mt-2 text-sm text-muted-foreground">{d}</p></div>)}</div>
        <p className="mt-6 max-w-3xl text-muted-foreground">Threat Detector moves all the calculations into tested code, keeps everyone on the same live data and explains every score, so teams spend their time on security analysis instead of fixing formulas.</p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">How it works</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-2">{STEPS.map(([n, t, d]) => <li key={n} className="flex gap-4 rounded-lg border border-border bg-card/85 p-5 backdrop-blur-md"><span className="font-mono text-2xl text-primary">{n}</span><div><h3 className="font-semibold">{t}</h3><p className="mt-1 text-sm text-muted-foreground">{d}</p></div></li>)}</ol>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">How the scoring works</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">Threat Detector keeps four separate measures so they are never mixed up.</p>
        <dl className="mt-6 space-y-3">{SCORES.map(([t, d]) => <div key={t} className="rounded-lg border-l-2 border-primary bg-card/85 p-5 backdrop-blur-md"><dt className="font-mono text-sm text-primary">{t}</dt><dd className="mt-1 text-sm text-muted-foreground">{d}</dd></div>)}</dl>
        <div className="mt-6 grid grid-cols-2 gap-3 font-mono text-sm sm:grid-cols-4">
          {[["Critical", "text-tier-critical"], ["High", "text-tier-high"], ["Medium", "text-tier-medium"], ["Low", "text-tier-low"]].map(([t, c]) => <div key={t} className="rounded-md border border-border bg-card/85 p-3 text-center"><span className={c}>■</span> {t}</div>)}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">Everything inside</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">{FEATURES.map(([t, d]) => <div key={t} className="rounded-lg border border-border bg-card/85 p-5 backdrop-blur-md"><h3 className="font-semibold">{t}</h3><p className="mt-1 text-sm text-muted-foreground">{d}</p></div>)}</div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card/85 p-6 backdrop-blur-md"><h2 className="text-xl font-semibold">Who it's for</h2><p className="mt-2 text-sm text-muted-foreground">Cybersecurity students, coursework teams, lab tutors and anyone learning vulnerability assessment and risk management in a hands-on lab environment.</p></div>
        <div className="rounded-lg border border-border bg-card/85 p-6 backdrop-blur-md"><h2 className="text-xl font-semibold">Important note</h2><p className="mt-2 text-sm text-muted-foreground">Threat Detector is an independent student project for learning purposes. It is not endorsed or certified by Middlesex University Dubai, and attack paths are simulations — not live scans of real systems.</p></div>
      </section>

      <section className="text-center">
        <h2 className="text-3xl font-semibold">See it for yourself.</h2>
        <div className="mt-6 flex flex-wrap justify-center gap-3"><Button asChild size="lg"><Link to="/demo">Try the live demo</Link></Button><Button asChild size="lg" variant="outline"><Link to="/auth" search={{ redirect: undefined, mode: undefined }}>Create a team workspace</Link></Button></div>
      </section>
    </main>
  </div>;
}
