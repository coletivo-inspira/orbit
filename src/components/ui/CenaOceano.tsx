import { useId, type CSSProperties } from "react";

type BolhaStyle = CSSProperties & { "--dur": string; "--atraso": string };

const BOLHAS: { left: string; size: number; dur: number; atraso: number }[] = [
  { left: "12%", size: 6, dur: 11, atraso: 0 },
  { left: "24%", size: 4, dur: 9, atraso: 3.5 },
  { left: "71%", size: 7, dur: 13, atraso: 1.2 },
  { left: "84%", size: 4, dur: 10, atraso: 5.8 },
  { left: "58%", size: 3, dur: 8, atraso: 7.1 },
  { left: "40%", size: 5, dur: 12, atraso: 9.4 },
];

/** Decorative underwater backdrop (light from the surface, rays, caustics and bubbles); fills its parent. */
export function CenaOceano({ className = "" }: { className?: string }) {
  const areia = useId();
  return (
    <div className={`oceano-cena pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <div className="oceano-raios absolute -inset-x-1/4 inset-y-0" />
      <div className="oceano-caustica absolute inset-0" />
      <svg className="absolute inset-x-0 bottom-0 h-16 w-full" viewBox="0 0 272 64" preserveAspectRatio="none">
        <defs>
          <linearGradient id={areia} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#dec9a8" stopOpacity="0.34" />
            <stop offset="1" stopColor="#a87356" stopOpacity="0.22" />
          </linearGradient>
        </defs>
        <path d="M0 40 C 50 26, 92 46, 140 36 S 226 22, 272 34 L272 64 L0 64 Z" fill={`url(#${areia})`} />
        <path d="M0 52 C 64 42, 110 58, 170 50 S 240 44, 272 50 L272 64 L0 64 Z" fill="rgb(168 115 86 / 22%)" />
      </svg>
      {BOLHAS.map((b) => (
        <span
          key={b.left}
          className="oceano-bolha"
          style={
            {
              left: b.left,
              width: b.size,
              height: b.size,
              "--dur": `${b.dur}s`,
              "--atraso": `${b.atraso}s`,
            } as BolhaStyle
          }
        />
      ))}
    </div>
  );
}
