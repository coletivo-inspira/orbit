import { useMemo, type Ref } from "react";
import { generateRadarMap, RADAR_MAP_SIZE } from "@/lib/engines/radarMap";

/**
 * Faint street map under the radar. The engine pans it slower than the bubbles (parallax),
 * so dragging feels like walking over the city without implying real positions.
 */
export function RadarMapBackdrop({ ref }: { ref?: Ref<SVGSVGElement> }) {
  const map = useMemo(() => generateRadarMap(), []);
  const half = RADAR_MAP_SIZE / 2;
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{
        maskImage: "radial-gradient(circle at center, black 30%, transparent 78%)",
        WebkitMaskImage: "radial-gradient(circle at center, black 30%, transparent 78%)",
      }}
      aria-hidden="true"
    >
      <svg
        ref={ref}
        className="absolute top-1/2 left-1/2 will-change-transform"
        width={RADAR_MAP_SIZE}
        height={RADAR_MAP_SIZE}
        viewBox={`${-half} ${-half} ${RADAR_MAP_SIZE} ${RADAR_MAP_SIZE}`}
        style={{ transform: "translate(-50%, -50%)" }}
      >
        <g transform="rotate(-14)">
          {map.parks.map((p, i) => (
            <ellipse key={i} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry} fill="rgb(217 228 214 / 6%)" />
          ))}
          <path d={map.river} fill="none" stroke="rgb(125 211 252 / 9%)" strokeWidth={34} strokeLinecap="round" />
          <path d={map.minor.join("")} fill="none" stroke="rgb(245 240 231 / 6%)" strokeWidth={2} />
          <path
            d={map.major.join("")}
            fill="none"
            stroke="rgb(245 240 231 / 10%)"
            strokeWidth={5}
            strokeLinecap="round"
          />
        </g>
      </svg>
    </div>
  );
}
