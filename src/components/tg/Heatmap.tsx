import { likelihood, riskScore, type Asset } from "@/lib/scoring";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
export function cellClass(l: number, i: number) { const r = l * i; return r >= 16 ? "heat-5" : r >= 10 ? "heat-4" : r >= 6 ? "heat-3" : r >= 3 ? "heat-2" : "heat-1"; }
const LV = ["Rare", "Unlikely", "Possible", "Likely", "Almost certain"]; const IV = ["Minimal", "Minor", "Moderate", "Major", "Severe"];
export function Heatmap({ assets, filter, onFilter, big }: { assets: Asset[]; filter?: [number, number] | null; onFilter?: (c: [number, number] | null) => void; big?: boolean }) {
  return <div>
    <div className="flex gap-2">
      <div className="flex flex-col justify-around pr-1 text-right text-[10px] text-muted-foreground">{[5, 4, 3, 2, 1].map((i) => <span key={i} className={big ? "h-24 leading-[6rem]" : ""}>{i} {IV[i - 1]}</span>)}</div>
      <div className="flex-1">
        <div className="grid grid-cols-5 gap-1" role="grid" aria-label="Likelihood versus impact matrix">{[5, 4, 3, 2, 1].flatMap((imp) => [1, 2, 3, 4, 5].map((lik) => {
          const here = assets.filter((a) => likelihood(a) === lik && a.criticality === imp);
          const active = filter && filter[0] === lik && filter[1] === imp;
          const btn = <button onClick={() => onFilter?.(active ? null : [lik, imp])} aria-label={`Likelihood ${lik}, impact ${imp}: ${here.length} assets`}
            className={`${big ? "h-24" : "h-16"} relative flex flex-wrap content-center justify-center gap-1 rounded border p-1 transition-all duration-500 ${cellClass(lik, imp)} ${active ? "border-foreground ring-2 ring-foreground" : "border-transparent"} ${onFilter ? "cursor-pointer hover:brightness-125" : ""}`}>
            {here.length > 0 && <span className="absolute right-1 top-0.5 font-mono text-[10px] font-semibold">{here.length}</span>}
            {here.map((a) => <span key={a.id} className={`${big ? "h-4 w-4" : "h-2.5 w-2.5"} rounded-full bg-foreground shadow transition-all duration-500 ${big ? "animate-pulse" : ""}`} />)}
          </button>;
          return here.length ? <Tooltip key={`${lik}-${imp}`}><TooltipTrigger asChild>{btn}</TooltipTrigger><TooltipContent className="max-w-xs">{here.map((a) => <div key={a.id} className="text-xs">{a.name} · risk {riskScore(a)}</div>)}</TooltipContent></Tooltip> : <div key={`${lik}-${imp}`}>{btn}</div>;
        }))}</div>
        <div className="mt-1 grid grid-cols-5 text-center text-[10px] text-muted-foreground">{LV.map((l, i) => <span key={l}>{i + 1} {l}</span>)}</div>
      </div>
    </div>
    <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground"><span>↑ Impact (criticality) · → Likelihood (vulnerability × exposure)</span>
      <span className="flex items-center gap-1">Low {[1, 2, 3, 4, 5].map((n) => <span key={n} className={`h-3 w-5 rounded-sm heat-${n}`} />)} Severe</span></div>
  </div>;
}
