import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ruleBasedReport, type AnalystReport } from "@/lib/analyst";
import { rowToAsset } from "@/lib/db";

const SCHEMA = {
  type: "object", additionalProperties: false,
  required: ["executiveSummary", "topAssets", "criticalVulnerabilities", "attackPaths", "impact", "recommendations", "mitre"],
  properties: {
    executiveSummary: { type: "string" },
    topAssets: { type: "array", items: { type: "object", additionalProperties: false, required: ["name", "riskScore", "tier", "why"], properties: { name: { type: "string" }, riskScore: { type: "number" }, tier: { type: "string" }, why: { type: "string" } } } },
    criticalVulnerabilities: { type: "array", items: { type: "object", additionalProperties: false, required: ["asset", "detail"], properties: { asset: { type: "string" }, detail: { type: "string" } } } },
    attackPaths: { type: "array", items: { type: "object", additionalProperties: false, required: ["path", "narrative"], properties: { path: { type: "array", items: { type: "string" } }, narrative: { type: "string" } } } },
    impact: { type: "string" },
    recommendations: { type: "array", items: { type: "object", additionalProperties: false, required: ["priority", "asset", "explanation", "remediation", "mitre"], properties: { priority: { type: "string", enum: ["P1", "P2", "P3"] }, asset: { type: "string" }, explanation: { type: "string" }, remediation: { type: "string" }, mitre: { type: ["string", "null"] } } } },
    mitre: { type: "array", items: { type: "object", additionalProperties: false, required: ["id", "name", "asset"], properties: { id: { type: "string" }, name: { type: "string" }, asset: { type: "string" } } } },
  },
} as const;

export const analyzeLab = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { workspaceId: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(d?.workspaceId ?? "")) throw new Error("Invalid workspace");
    return d;
  })
  .handler(async ({ data, context }): Promise<AnalystReport & { note?: string }> => {
    const { data: rows, error } = await context.supabase.from("assets").select("*").eq("workspace_id", data.workspaceId);
    if (error) throw new Error("Could not load workspace assets");
    const assets = (rows ?? []).map(rowToAsset);
    const facts = ruleBasedReport(assets);
    try {
      const { generateResponse } = await import("@lovable.dev/ai-gateway");
      const payload = {
        assets: assets.map((a) => ({ name: a.name, type: a.type, scenario: a.scenario, vulnerability: a.vulnerability, criticality: a.criticality, exposure: a.exposure, appliedMitigations: a.controls, connectsTo: a.links.map((l) => assets.find((x) => x.id === l)?.name).filter(Boolean), cvss: a.cvss ?? null })),
        computed: { topAssets: facts.topAssets, simulatedAttackPaths: facts.attackPaths.map((p) => p.path) },
      };
      const res = await generateResponse({
        model: "openai/gpt-6.1-sol",
        instructions: "You are a cybersecurity risk analyst writing for university coursework teams. Use ONLY the supplied workspace data. Threat Detector risk scores and attack paths are pre-computed: reuse them exactly, never invent assets, scores or paths. Attack paths are simulated from a configured topology, not observed attacks — say so. Map MITRE ATT&CK technique IDs only when justified. Be concise and professional.",
        input: [{ role: "user", content: `Analyse this lab workspace and return the JSON report.\n${JSON.stringify(payload)}` }],
        text: { format: { type: "json_schema", name: "lab_report", schema: SCHEMA, strict: true } },
      });
      const out = (res as { output?: { type: string; content?: { type: string; text?: string }[] }[] }).output ?? [];
      const text = out.flatMap((o) => (o.type === "message" ? o.content ?? [] : [])).find((c) => c.type === "output_text")?.text;
      if (!text) throw new Error("Empty AI response");
      const parsed = JSON.parse(text) as Omit<AnalystReport, "source" | "generatedAt">;
      return { ...parsed, source: "ai", generatedAt: new Date().toISOString() };
    } catch (e) {
      console.error("AI analyst failed, using rule-based analysis", e);
      return { ...facts, note: "AI analysis was unavailable, so this report uses Threat Detector's transparent rule-based analysis." };
    }
  });
