import { cvssScore, cvssVector, residualScore, riskScore, riskTier, type Asset } from "./scoring";
/** Treat formula-like text as literal spreadsheet data, then escape CSV syntax. */
export function csvCell(value: unknown): string {
  const text = String(value ?? "");
  // Also detect formulas hidden behind whitespace/control characters.
  const dangerous = typeof value !== "number" &&
    (/^[\s\u0000-\u001f]*[=+\-@＝＋－＠]/u.test(text) || /^[\t\r\n]/.test(text));
  const safe = dangerous ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
export function assetsCsv(assets: Asset[]) {
  const head = ["Name", "Scenario", "Type", "Vulnerability", "Criticality", "Exposure", "CVSS score", "CVSS vector", "Risk score", "Risk tier", "Applied mitigations", "Residual risk", "Connects to"];
  const rows = assets.map((a) => [a.name, a.scenario, a.type, a.vulnerability, a.criticality, a.exposure, a.cvss ? cvssScore(a.cvss) : "", a.cvss ? cvssVector(a.cvss) : "", riskScore(a), riskTier(riskScore(a)), a.controls.join("; "), residualScore(a, a.controls), a.links.map((l) => assets.find((x) => x.id === l)?.name ?? "").join("; ")]);
  return [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
}
export function download(name: string, text: string, type = "text/csv") {
  const url = URL.createObjectURL(new Blob([text], { type })); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}
