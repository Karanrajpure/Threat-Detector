import { useEffect, useRef, useState } from "react";
export function CountUp({ value, decimals = 0, duration = 900 }: { value: number; decimals?: number; duration?: number }) {
  const [v, setV] = useState(0); const from = useRef(0);
  useEffect(() => { const start = performance.now(), a = from.current; let raf = 0;
    const tick = (t: number) => { const p = Math.min(1, (t - start) / duration), e = 1 - Math.pow(1 - p, 3); setV(a + (value - a) * e); if (p < 1) raf = requestAnimationFrame(tick); else from.current = value; };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf); }, [value, duration]);
  return <>{v.toFixed(decimals)}</>;
}
