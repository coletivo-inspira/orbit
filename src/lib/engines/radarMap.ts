/** Side of the repeating map tile; streets are spaced so the tile wraps without seams. */
export const RADAR_TILE = 1200;
const STREET_GAP = 75;

export interface RadarMap {
  minor: string[];
  major: string[];
  parks: { cx: number; cy: number; rx: number; ry: number }[];
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Stylized street map behind the radar, as one deterministic tile that repeats forever:
 * avenues every fourth street, broken side streets and a few parks. Coordinates are in [0, RADAR_TILE).
 */
export function generateRadarMap(seed = 2026): RadarMap {
  const rand = mulberry32(seed);
  const minor: string[] = [];
  const major: string[] = [];

  for (let v = 0; v < RADAR_TILE; v += STREET_GAP) {
    const isMajor = (v / STREET_GAP) % 4 === 0;
    for (const vertical of [true, false]) {
      if (isMajor) {
        major.push(vertical ? `M${v} 0V${RADAR_TILE}` : `M0 ${v}H${RADAR_TILE}`);
        continue;
      }
      let pos = 0;
      let d = "";
      while (pos < RADAR_TILE) {
        const end = Math.min(RADAR_TILE, pos + 90 + rand() * 260);
        if (rand() > 0.22) {
          d += vertical ? `M${v} ${pos.toFixed(0)}V${end.toFixed(0)}` : `M${pos.toFixed(0)} ${v}H${end.toFixed(0)}`;
        }
        pos = end + 20 + rand() * 60;
      }
      if (d) minor.push(d);
    }
  }

  const parks = Array.from({ length: 3 }, () => ({
    cx: Math.round(120 + rand() * (RADAR_TILE - 240)),
    cy: Math.round(120 + rand() * (RADAR_TILE - 240)),
    rx: Math.round(50 + rand() * 70),
    ry: Math.round(40 + rand() * 50),
  }));

  return { minor, major, parks };
}

export function radarMapSvg(map: RadarMap): string {
  const parks = map.parks
    .map((p) => `<ellipse cx="${p.cx}" cy="${p.cy}" rx="${p.rx}" ry="${p.ry}" fill="rgb(217 228 214 / 6%)"/>`)
    .join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${RADAR_TILE}" height="${RADAR_TILE}" viewBox="0 0 ${RADAR_TILE} ${RADAR_TILE}">` +
    parks +
    `<path d="${map.minor.join("")}" fill="none" stroke="rgb(245 240 231 / 6%)" stroke-width="2"/>` +
    `<path d="${map.major.join("")}" fill="none" stroke="rgb(245 240 231 / 10%)" stroke-width="5"/>` +
    `</svg>`
  );
}
