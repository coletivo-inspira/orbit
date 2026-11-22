/** Side of the square backdrop, larger than any pan so its edges never show. */
export const RADAR_MAP_SIZE = 1800;

export interface RadarMap {
  minor: string[];
  major: string[];
  river: string;
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
 * Stylized, deterministic street map behind the radar: a slightly irregular grid with
 * broken side streets, a few curving avenues, a river and parks. Coordinates are centered on (0, 0).
 */
export function generateRadarMap(seed = 2026): RadarMap {
  const rand = mulberry32(seed);
  const half = RADAR_MAP_SIZE / 2;
  const minor: string[] = [];
  const major: string[] = [];

  for (let v = -half; v <= half; v += 75) {
    const isMajor = Math.round((v + half) / 75) % 4 === 0;
    const wobble = (rand() - 0.5) * 18;
    for (const vertical of [true, false]) {
      if (isMajor) {
        major.push(vertical ? `M${v + wobble} ${-half}V${half}` : `M${-half} ${v + wobble}H${half}`);
        continue;
      }
      let pos = -half;
      let d = "";
      while (pos < half) {
        const len = 90 + rand() * 260;
        const end = Math.min(half, pos + len);
        if (rand() > 0.22) d += vertical ? `M${v + wobble} ${pos}V${end}` : `M${pos} ${v + wobble}H${end}`;
        pos = end + 20 + rand() * 60;
      }
      if (d) minor.push(d);
    }
  }

  for (let i = 0; i < 3; i++) {
    const y0 = -half + rand() * RADAR_MAP_SIZE;
    const y1 = -half + rand() * RADAR_MAP_SIZE;
    const c1 = (rand() - 0.5) * RADAR_MAP_SIZE;
    const c2 = (rand() - 0.5) * RADAR_MAP_SIZE;
    major.push(
      `M${-half} ${y0.toFixed(0)}C${-half / 3} ${c1.toFixed(0)} ${half / 3} ${c2.toFixed(0)} ${half} ${y1.toFixed(0)}`,
    );
  }

  const rx = (rand() - 0.5) * 500;
  const river = `M${(-half + 120 + rx).toFixed(0)} ${-half}C${(rx - 260).toFixed(0)} ${-half / 3} ${(rx + 380).toFixed(0)} ${half / 4} ${(rx - 60).toFixed(0)} ${half}`;

  const parks = Array.from({ length: 4 }, () => ({
    cx: Math.round((rand() - 0.5) * RADAR_MAP_SIZE * 0.8),
    cy: Math.round((rand() - 0.5) * RADAR_MAP_SIZE * 0.8),
    rx: Math.round(50 + rand() * 90),
    ry: Math.round(40 + rand() * 70),
  }));

  return { minor, major, river, parks };
}
