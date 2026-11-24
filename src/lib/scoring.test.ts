import { describe, it, expect } from "vitest";
import { riskScore, residualScore, riskTier, cvssScore, cvssSeverity, parseCvssVector, attackPaths, likelihood, GATEWAY, type Asset } from "./scoring";
const base = { vulnerability: 10, criticality: 5, exposure: "internet" as const };
describe("ThreatGrid risk score", () => {
  it("max internet asset scores 100", () => expect(riskScore(base)).toBe(100));
  it("isolated weight is 0.25", () => expect(riskScore({ ...base, exposure: "isolated" })).toBe(25));
  it("tiers", () => { expect(riskTier(60)).toBe("Critical"); expect(riskTier(35)).toBe("High"); expect(riskTier(15)).toBe("Medium"); expect(riskTier(14.9)).toBe("Low"); });
  it("likelihood", () => expect(likelihood({ vulnerability: 10, exposure: "internet" })).toBe(5));
});
describe("residual risk", () => {
  it("no controls equals risk score", () => expect(residualScore(base, [])).toBe(100));
  it("patching halves vulnerability", () => expect(residualScore(base, ["patch"])).toBe(50));
  it("segmentation drops exposure one level", () => expect(residualScore(base, ["segmentation"])).toBe(75));
  it("EDR multiplies final by 0.75", () => expect(residualScore(base, ["edr"])).toBe(75));
  it("does not change risk score", () => { residualScore(base, ["patch"]); expect(riskScore(base)).toBe(100); });
});
describe("official CVSS v3.1 test vectors", () => {
  const v = (s: string) => cvssScore(parseCvssVector(s)!);
  it("9.8", () => expect(v("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H")).toBe(9.8));
  it("10.0", () => expect(v("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H")).toBe(10));
  it("6.4 scope changed + PR:L", () => expect(v("CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:C/C:L/I:L/A:N")).toBe(6.4));
  it("5.5", () => expect(v("CVSS:3.1/AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N")).toBe(5.5));
  it("6.1 reflected XSS", () => expect(v("CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N")).toBe(6.1));
  it("4.2", () => expect(v("CVSS:3.1/AV:L/AC:L/PR:H/UI:N/S:U/C:L/I:L/A:L")).toBe(4.2));
  it("no impact = 0", () => expect(v("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N")).toBe(0));
  it("severity bands", () => { expect(cvssSeverity(9.0)).toBe("Critical"); expect(cvssSeverity(7.0)).toBe("High"); expect(cvssSeverity(4.0)).toBe("Medium"); expect(cvssSeverity(0.1)).toBe("Low"); });
  it("rejects invalid vectors", () => expect(parseCvssVector("CVSS:3.1/AV:X/AC:L")).toBeNull());
});
describe("directional attack paths", () => {
  const A = (id: string, exposure: Asset["exposure"], criticality: number, links: string[]): Asset => ({ id, name: id, scenario: "", type: "", vulnerability: 5, criticality, exposure, controls: [], links });
  it("follows link direction only", () => {
    const xs = [A("web", "internet", 3, ["db"]), A("db", "internal", 5, [])];
    expect(attackPaths(xs)).toContainEqual([GATEWAY, "web", "db"]);
    expect(attackPaths([A("web", "internet", 3, []), A("db", "internal", 5, ["web"])])).toEqual([]);
  });
});
