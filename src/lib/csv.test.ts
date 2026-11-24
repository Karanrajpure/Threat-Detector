import { describe, expect, it } from "vitest";
import { assetsCsv, csvCell } from "./csv";
import { demoAssets } from "./demo-data";

describe("spreadsheet-safe CSV cells", () => {
  it.each(["=1+1", "+SUM(1)", "-1+1", "@SUM(1)", "  =1+1", "\u0000=1+1", "＝1+1", "＋1", "－1", "＠SUM(1)"])("neutralizes %j", (value) => {
    expect(csvCell(value)).toBe(`'${value}`);
  });
  it.each(["\t=1+1", "\r=1+1", "\n=1+1"])("neutralizes leading controls %j", (value) => {
    expect(csvCell(value).replace(/^"|"$/g, "").startsWith("'")).toBe(true);
  });
  it("escapes separators, quotes, and carriage returns", () => {
    expect(csvCell('one,"two"')).toBe('"one,""two"""');
    expect(csvCell("one\rtwo")).toBe('"one\rtwo"');
    expect(csvCell('=HYPERLINK("https://example.com","x")')).toBe('"\'=HYPERLINK(""https://example.com"",""x"")"');
  });
  it("keeps numeric scores and ordinary text unchanged", () => {
    expect(csvCell(-5)).toBe("-5");
    expect(csvCell(9.8)).toBe("9.8");
    expect(csvCell("LAB-WEB-01")).toBe("LAB-WEB-01");
    expect(csvCell(null)).toBe("");
  });
  it("protects all user-controlled export columns including linked names", () => {
    const assets = demoAssets();
    const first = assets[0]!;
    const second = assets[1]!;
    first.name = "=1+1";
    first.scenario = "+1+1";
    first.type = "@SUM(1)";
    second.name = "-1+1";
    const row = assetsCsv(assets).split("\n")[1]!;
    expect(row.startsWith("'=1+1,'+1+1,'@SUM(1),9.1,4,")).toBe(true);
    expect(row.endsWith("'-1+1; Juice Shop VM")).toBe(true);
  });
});