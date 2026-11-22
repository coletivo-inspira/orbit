import { useMemo, type Ref } from "react";
import { generateRadarMap, RADAR_TILE, radarMapSvg } from "@/lib/engines/radarMap";

const MASK = "radial-gradient(circle at center, black 30%, transparent 78%)";

/**
 * Faint street map under the radar, tiled so it never runs out however far the radar pans.
 * The engine shifts its background position slower than the bubbles (parallax).
 */
export function RadarMapBackdrop({ ref }: { ref?: Ref<HTMLDivElement> }) {
  const image = useMemo(() => `url("data:image/svg+xml,${encodeURIComponent(radarMapSvg(generateRadarMap()))}")`, []);
  return (
    <div
      ref={ref}
      className="pointer-events-none absolute inset-0"
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
