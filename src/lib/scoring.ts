/**
 * ThreatGrid calculation core. Three values are kept strictly separate:
 * 1. Official CVSS v3.1 base score (cvssScore) — FIRST specification.
 * 2. ThreatGrid weighted exploit risk score (riskScore) — vuln/10 × exposure × crit/5 × 100.
 * 3. Residual risk (residualScore) — risk score after the educational mitigation model.
 */
export type Exposure = "isolated" | "internal" | "campus" | "internet";
export const EXPOSURES: Exposure[] = ["isolated", "internal", "campus", "internet"];
export type Control = "patch" | "segmentation" | "mfa" | "edr" | "nac";
export interface Cvss { AV: "N" | "A" | "L" | "P"; AC: "L" | "H"; PR: "N" | "L" | "H"; UI: "N" | "R"; S: "U" | "C"; C: "N" | "L" | "H"; I: "N" | "L" | "H"; A: "N" | "L" | "H" }
export interface Asset {
  id: string; name: string; scenario: string; type: string;
  vulnerability: number; criticality: number; exposure: Exposure;
  controls: Control[]; links: string[]; cvss?: Cvss | null | undefined;
}
export const EXPOSURE_WEIGHT: Record<Exposure, number> = { isolated: 0.25, internal: 0.5, campus: 0.75, internet: 1 };

type RiskInput = Pick<Asset, "vulnerability" | "criticality" | "exposure">;
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const r1 = (x: number) => Math.round(x * 10) / 10;

/** ThreatGrid weighted exploit risk score, 0–100. Unchanged formula. */
export function riskScore(a: RiskInput) {
  return r1((clamp(a.vulnerability, 0, 10) / 10) * EXPOSURE_WEIGHT[a.exposure] * (clamp(a.criticality, 1, 5) / 5) * 100);
}

// ---------- Educational mitigation model (configurable) ----------
export interface MitigationModel { patch: number; segmentationSteps: number; mfa: number; edr: number; nac: number }
export const DEFAULT_MODEL: MitigationModel = { patch: 0.5, segmentationSteps: 1, mfa: 0.8, edr: 0.75, nac: 0.85 };
export const CONTROL_INFO: Record<Control, { label: string; short: string; assumption: (m: MitigationModel) => string }> = {
  patch: { label: "Security patching", short: "Patch", assumption: (m) => `Vulnerability rating × ${m.patch} (known CVEs closed)` },
  segmentation: { label: "Firewall segmentation", short: "Segment", assumption: (m) => `Exposure drops ${m.segmentationSteps} level(s) (e.g. campus → internal)` },
  mfa: { label: "Multi-factor authentication", short: "MFA", assumption: (m) => `Vulnerability rating × ${m.mfa} (credential attacks harder)` },
  edr: { label: "Endpoint Detection & Response", short: "EDR", assumption: (m) => `Final risk × ${m.edr} (faster detection & containment)` },
  nac: { label: "Network access control", short: "NAC", assumption: (m) => `Exposure weight × ${m.nac} (only authorised devices connect)` },
};
export const CONTROLS = Object.keys(CONTROL_INFO) as Control[];

/** Residual risk after simulated mitigation. Never alters CVSS or the stored asset. */
export function residualScore(a: RiskInput, controls: Control[], m: MitigationModel = DEFAULT_MODEL) {
  let v = clamp(a.vulnerability, 0, 10);
  let expIdx = EXPOSURES.indexOf(a.exposure);
  let expMul = 1, post = 1;
  if (controls.includes("patch")) v *= m.patch;
  if (controls.includes("mfa")) v *= m.mfa;
  if (controls.includes("segmentation")) expIdx = Math.max(0, expIdx - m.segmentationSteps);
  if (controls.includes("nac")) expMul *= m.nac;
  if (controls.includes("edr")) post *= m.edr;
  return r1((v / 10) * EXPOSURE_WEIGHT[EXPOSURES[expIdx]!] * expMul * (clamp(a.criticality, 1, 5) / 5) * 100 * post);
}

export type Tier = "Critical" | "High" | "Medium" | "Low";
export const TIERS: Tier[] = ["Critical", "High", "Medium", "Low"];
export function riskTier(score: number): Tier {
  if (score >= 60) return "Critical";
  if (score >= 35) return "High";
  if (score >= 15) return "Medium";
  return "Low";
}
/** Likelihood 1–5 from vulnerability × exposure; impact 1–5 = criticality. */
export function likelihood(a: Pick<Asset, "vulnerability" | "exposure">) {
  return clamp(Math.ceil((a.vulnerability / 10) * EXPOSURE_WEIGHT[a.exposure] * 5), 1, 5);
}

// ---------- Official CVSS v3.1 base score (FIRST spec §7) ----------
const W = { AV: { N: 0.85, A: 0.62, L: 0.55, P: 0.2 }, AC: { L: 0.77, H: 0.44 }, UI: { N: 0.85, R: 0.62 }, CIA: { H: 0.56, L: 0.22, N: 0 } } as const;
/** Roundup as defined in CVSS v3.1 Appendix A (floating-point safe). */
export function roundup(x: number) { const i = Math.round(x * 100000); return i % 10000 === 0 ? i / 100000 : (Math.floor(i / 10000) + 1) / 10; }
export function cvssScore(m: Cvss) {
  const pr = m.PR === "N" ? 0.85 : m.PR === "L" ? (m.S === "C" ? 0.68 : 0.62) : m.S === "C" ? 0.5 : 0.27;
  const iss = 1 - (1 - W.CIA[m.C]) * (1 - W.CIA[m.I]) * (1 - W.CIA[m.A]);
  const impact = m.S === "U" ? 6.42 * iss : 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15);
  const expl = 8.22 * W.AV[m.AV] * W.AC[m.AC] * pr * W.UI[m.UI];
  if (impact <= 0) return 0;
  return m.S === "U" ? roundup(Math.min(impact + expl, 10)) : roundup(Math.min(1.08 * (impact + expl), 10));
}
export type Severity = "None" | "Low" | "Medium" | "High" | "Critical";
export function cvssSeverity(s: number): Severity { return s === 0 ? "None" : s < 4 ? "Low" : s < 7 ? "Medium" : s < 9 ? "High" : "Critical"; }
export const cvssVector = (m: Cvss) => `CVSS:3.1/AV:${m.AV}/AC:${m.AC}/PR:${m.PR}/UI:${m.UI}/S:${m.S}/C:${m.C}/I:${m.I}/A:${m.A}`;
export const DEFAULT_CVSS: Cvss = { AV: "N", AC: "L", PR: "N", UI: "N", S: "U", C: "H", I: "H", A: "H" };
const VALID: Record<keyof Cvss, string[]> = { AV: ["N", "A", "L", "P"], AC: ["L", "H"], PR: ["N", "L", "H"], UI: ["N", "R"], S: ["U", "C"], C: ["N", "L", "H"], I: ["N", "L", "H"], A: ["N", "L", "H"] };
export function isValidCvss(x: unknown): x is Cvss {
  if (!x || typeof x !== "object") return false;
  return (Object.keys(VALID) as (keyof Cvss)[]).every((k) => VALID[k].includes((x as Record<string, string>)[k] ?? ""));
}
export function parseCvssVector(v: string): Cvss | null {
  const m = /^CVSS:3\.1\/(.+)$/.exec(v.trim()); if (!m) return null;
  const o: Record<string, string> = {};
  for (const part of m[1]!.split("/")) { const [k, val] = part.split(":"); if (k && val) o[k] = val; }
  return isValidCvss(o) ? o : null;
}
export function explainCvss(m: Cvss) {
  const s = cvssScore(m), sev = cvssSeverity(s);
  const parts = [
    m.AV === "N" ? "exploitable remotely over the network" : m.AV === "A" ? "requires adjacent-network access" : m.AV === "L" ? "requires local access" : "requires physical access",
    m.AC === "L" ? "low attack complexity" : "high attack complexity",
    m.PR === "N" ? "no privileges needed" : m.PR === "L" ? "low privileges needed" : "high privileges needed",
    m.UI === "N" ? "no user interaction" : "needs user interaction",
    m.S === "C" ? "impact can spread beyond the vulnerable component (scope changed)" : "impact stays within the component",
  ];
  return `${sev} severity (${s.toFixed(1)}): ${parts.join(", ")}. Impact — confidentiality ${m.C}, integrity ${m.I}, availability ${m.A}.`;
}

// ---------- Directional attack paths over the simulated topology ----------
export const GATEWAY = "__internet__";
/** Edges: internet gateway → internet-exposed assets, plus each asset's outgoing links. */
export function edges(assets: Asset[]): [string, string][] {
  const ids = new Set(assets.map((a) => a.id));
  const out: [string, string][] = assets.filter((a) => a.exposure === "internet").map((a) => [GATEWAY, a.id]);
  for (const a of assets) for (const l of a.links) if (ids.has(l) && l !== a.id) out.push([a.id, l]);
  return out;
}
/** Shortest directed paths from entry points (gateway or campus-exposed assets) to criticality-5 assets. */
export function attackPaths(assets: Asset[], maxLen = 5): string[][] {
  const adj = new Map<string, string[]>();
  for (const [s, t] of edges(assets)) adj.set(s, [...(adj.get(s) ?? []), t]);
  const targets = new Set(assets.filter((a) => a.criticality === 5).map((a) => a.id));
  const sources = [GATEWAY, ...assets.filter((a) => a.exposure === "campus").map((a) => a.id)];
  const out: string[][] = [];
  for (const s of sources) {
    const prev = new Map<string, string | null>([[s, null]]); const q = [s];
    while (q.length) { const c = q.shift()!; for (const n of adj.get(c) ?? []) if (!prev.has(n)) { prev.set(n, c); q.push(n); } }
    for (const t of targets) if (t !== s && prev.has(t)) {
      const p: string[] = []; let c: string | null = t; while (c) { p.unshift(c); c = prev.get(c) ?? null; }
      if (p.length <= maxLen && !(s !== GATEWAY && targets.has(s))) out.push(p);
    }
  }
  return out.sort((a, b) => a.length - b.length);
}

// ---------- Validation ----------
export function validateAsset(a: Partial<Asset>): string | null {
  if (a.name !== undefined && (a.name.trim().length < 1 || a.name.length > 80)) return "Name must be 1–80 characters";
  if (a.vulnerability !== undefined && !(a.vulnerability >= 0 && a.vulnerability <= 10)) return "Vulnerability must be between 0 and 10";
  if (a.criticality !== undefined && !(Number.isInteger(a.criticality) && a.criticality >= 1 && a.criticality <= 5)) return "Criticality must be 1–5";
  if (a.exposure !== undefined && !EXPOSURES.includes(a.exposure)) return "Invalid exposure";
  if (a.cvss && !isValidCvss(a.cvss)) return "Invalid CVSS metrics";
  return null;
}

export function labStats(assets: Asset[], controlsFor: (a: Asset) => Control[] = (a) => a.controls, m: MitigationModel = DEFAULT_MODEL) {
  const risk = assets.map(riskScore), resid = assets.map((a) => residualScore(a, controlsFor(a), m));
  const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
  const total = risk.reduce((s, x) => s + x, 0), totalR = resid.reduce((s, x) => s + x, 0);
  return { avgRisk: r1(avg(risk)), avgResidual: r1(avg(resid)), reduction: total ? r1((1 - totalR / total) * 100) : 0,
    counts: Object.fromEntries(TIERS.map((t) => [t, risk.filter((s) => riskTier(s) === t).length])) as Record<Tier, number> };
}
