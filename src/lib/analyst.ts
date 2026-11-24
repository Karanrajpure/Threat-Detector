import { attackPaths, cvssScore, cvssSeverity, GATEWAY, riskScore, riskTier, type Asset } from "./scoring";

export interface Recommendation { priority: "P1" | "P2" | "P3"; asset: string; explanation: string; remediation: string; mitre: string | null }
export interface AnalystReport {
  source: "ai" | "rules";
  generatedAt: string;
  executiveSummary: string;
  topAssets: { name: string; riskScore: number; tier: string; why: string }[];
  criticalVulnerabilities: { asset: string; detail: string }[];
  attackPaths: { path: string[]; narrative: string }[];
  impact: string;
  recommendations: Recommendation[];
  mitre: { id: string; name: string; asset: string }[];
}

const MITRE: Record<string, { id: string; name: string; fix: string }> = {
  "Web application": { id: "T1190", name: "Exploit Public-Facing Application", fix: "Patch the application stack, enable a WAF and validate all inputs" },
  Database: { id: "T1213", name: "Data from Information Repositories", fix: "Restrict database access to application hosts and use parameterised queries" },
  "Active Directory server": { id: "T1558", name: "Steal or Forge Kerberos Tickets", fix: "Enforce MFA for privileged accounts, tier the AD admin model and rotate KRBTGT" },
  "Wi-Fi access point": { id: "T1557", name: "Adversary-in-the-Middle", fix: "Move to WPA3-Enterprise with 802.1X and isolate the lab SSID on its own VLAN" },
  "IoT device": { id: "T1078", name: "Valid Accounts (default credentials)", fix: "Replace default credentials and segment IoT devices from lab servers" },
  "Virtualization host": { id: "T1610", name: "Deploy Container", fix: "Run CI jobs rootless, remove direct internet exposure and scan images" },
  Firewall: { id: "T1562", name: "Impair Defenses", fix: "Update firmware, audit rule sets and enable configuration-change alerts" },
  "PLC simulator": { id: "T0866", name: "Exploitation of Remote Services (ICS)", fix: "Keep the ICS network air-gapped and monitor for unexpected connections" },
  "Linux server": { id: "T1210", name: "Exploitation of Remote Services", fix: "Patch exposed services and disable unused daemons" },
  "Windows client": { id: "T1204", name: "User Execution", fix: "Enable EDR and application allow-listing" },
  "Security testing machine": { id: "T1588", name: "Obtain Capabilities", fix: "Restrict attack tooling to an isolated range network" },
};
export const mitreFor = (type: string) => MITRE[type] ?? { id: "T1210", name: "Exploitation of Remote Services", fix: "Apply vendor patches and enable EDR" };

export function nameOf(assets: Asset[], id: string) { return id === GATEWAY ? "Internet gateway" : assets.find((a) => a.id === id)?.name ?? id; }

/** Transparent deterministic analysis used when AI is unavailable, and as factual grounding for the AI. */
export function ruleBasedReport(assets: Asset[]): AnalystReport {
  const scored = assets.map((a) => ({ a, s: riskScore(a) })).sort((x, y) => y.s - x.s);
  const top = scored.slice(0, 3);
  const paths = attackPaths(assets).slice(0, 5).map((p) => ({
    path: p.map((id) => nameOf(assets, id)),
    narrative: `Simulated route: ${p.length - 2} intermediate hop(s) from ${nameOf(assets, p[0]!)} to ${nameOf(assets, p.at(-1)!)} based on the configured topology.`,
  }));
  const crit = scored.filter((x) => riskTier(x.s) === "Critical" || x.a.vulnerability >= 9 || (x.a.cvss && cvssScore(x.a.cvss) >= 9));
  const avg = scored.reduce((t, x) => t + x.s, 0) / (scored.length || 1);
  const recs: Recommendation[] = top.map(({ a, s }, i) => { const m = mitreFor(a.type); return {
    priority: i === 0 || riskTier(s) === "Critical" ? "P1" : "P2", asset: a.name,
    explanation: `Risk score ${s} (${riskTier(s)}), ${a.exposure} exposure, criticality ${a.criticality}/5.`,
    remediation: m.fix, mitre: `${m.id} ${m.name}` }; });
  if (paths.length) recs.push({ priority: "P2", asset: paths[0]!.path[1] ?? "Network", explanation: `${paths.length} simulated path(s) reach critical assets.`, remediation: "Apply firewall segmentation between entry points and critical servers.", mitre: "T1021 Remote Services" });
  const isolatedCrit = scored.find((x) => x.a.exposure === "isolated" && x.a.criticality === 5);
  if (isolatedCrit) recs.push({ priority: "P3", asset: isolatedCrit.a.name, explanation: "Isolated but critical; keep it that way.", remediation: "Verify isolation with a quarterly connectivity test.", mitre: null });
  return {
    source: "rules", generatedAt: new Date().toISOString(),
    executiveSummary: `The workspace contains ${assets.length} lab assets with an average Threat Detector risk score of ${avg.toFixed(1)}. ${scored.filter((x) => riskTier(x.s) === "Critical").length} are Critical and ${scored.filter((x) => riskTier(x.s) === "High").length} are High. ${top[0] ? `${top[0].a.name} carries the highest risk.` : ""}`,
    topAssets: top.map(({ a, s }) => ({ name: a.name, riskScore: s, tier: riskTier(s), why: `Vulnerability ${a.vulnerability}/10, ${a.exposure} exposure, criticality ${a.criticality}/5.` })),
    criticalVulnerabilities: crit.slice(0, 5).map(({ a }) => ({ asset: a.name, detail: a.cvss ? `CVSS ${cvssScore(a.cvss)} (${cvssSeverity(cvssScore(a.cvss))})` : `Vulnerability rating ${a.vulnerability}/10` })),
    attackPaths: paths,
    impact: "Compromise of critical lab assets could interrupt coursework, expose student lab data and allow lateral movement into shared campus infrastructure.",
    recommendations: recs,
    mitre: top.map(({ a }) => { const m = mitreFor(a.type); return { id: m.id, name: m.name, asset: a.name }; }),
  };
}
