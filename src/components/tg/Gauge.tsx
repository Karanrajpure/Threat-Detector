import { riskTier } from "@/lib/scoring";
import { TIER_VAR } from "./ui";
export function Gauge({ value }: { value: number }) {
  const angle = Math.PI * (1 - Math.min(100, value) / 100), r = 90;
  const x = 110 + Math.cos(angle) * r, y = 110 - Math.sin(angle) * r, tier = riskTier(value);
  return <svg viewBox="0 0 220 130" className="w-full max-w-sm">
    <path d="M20 110 A90 90 0 0 1 200 110" fill="none" stroke="var(--muted)" strokeWidth={16} strokeLinecap="round" />
    <path d={`M20 110 A90 90 0 0 1 ${x} ${y}`} fill="none" stroke={TIER_VAR[tier]} strokeWidth={16} strokeLinecap="round" style={{ transition: "all .6s" }} />
    <text x={110} y={100} textAnchor="middle" fontSize={34} fontFamily="var(--font-mono)" fill="var(--foreground)">{value.toFixed(1)}</text>
    <text x={110} y={124} textAnchor="middle" fontSize={12} fill={TIER_VAR[tier]}>LAB THREAT: {tier.toUpperCase()}</text>
  </svg>;
}
