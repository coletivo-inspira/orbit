import { useMemo, type Ref } from "react";
import { generateRadarMap, RADAR_TILE, radarMapSvg } from "@/lib/engines/radarMap";

const MASK = "radial-gradient(circle at center, black 30%, transparent 78%)";

/**
 * Illustrative street pattern, tiled so it never runs out however far the radar pans. Under the map
 * radar it stands in for the real map while it loads or when it can't load (offline, no WebGL).
 */
export function RadarMapBackdrop({ ref, className = "" }: { ref?: Ref<HTMLDivElement>; className?: string }) {
  const image = useMemo(() => `url("data:image/svg+xml,${encodeURIComponent(radarMapSvg(generateRadarMap()))}")`, []);
  return (
    <div
      ref={ref}
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{
        backgroundImage: image,
        backgroundSize: `${RADAR_TILE}px ${RADAR_TILE}px`,
        backgroundPosition: "center",
        maskImage: MASK,
        WebkitMaskImage: MASK,
      }}
      aria-hidden="true"
    />
  );
}
