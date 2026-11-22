import { worldSize, type MercatorPoint } from "@/lib/geo/mercator";

/**
 * Screen-space layout of the map radar: every profile has a geographic anchor; at each zoom step
 * bubbles keep their anchor when free, are nudged a little when they would overlap (label-placement
 * style) and, when there is no room nearby, join the closest bubble as a cluster with a count.
 * The result is cached per zoom step, so panning never recomputes it.
 */

/** Extents of a marker around its anchor, in screen px: the avatar is centered, the name pill hangs below. */
export interface MarkerBox {
  halfW: number;
  top: number;
  bottom: number;
}

export interface LayoutItem {
  /** World px at the layout zoom (anchor plus nudge). */
  x: number;
  y: number;
  /** Profile indices; the first one is the lead (highest priority). More than one means a cluster. */
  members: number[];
}

export interface MapLayout {
  zoom: number;
  items: LayoutItem[];
  /** Item index of each profile. */
  itemOf: Int32Array;
}

export interface LayoutOptions {
  zoom: number;
  box: MarkerBox;
  /** Farthest a bubble may move from its anchor before it is clustered instead, in px. */
  maxNudge: number;
  /** A marker nothing may cover (the user's own avatar), with its anchor in Mercator space. */
  avoid?: { point: MercatorPoint; box: MarkerBox };
  /** Extra room kept between markers, in px. */
  gap?: number;
}

/** Layouts are computed on quarter-zoom steps, rounded down so markers only spread apart until the next step. */
export function layoutZoom(zoom: number): number {
  return Math.floor(zoom * 4 + 1e-6) / 4;
}

/** Bubbles shrink a little when zoomed out so the city fits more faces before clustering. */
export function bubbleScale(zoom: number): number {
  return Math.max(0.72, Math.min(1, 0.72 + 0.08 * (zoom - 11)));
}

export function scaleBox(box: MarkerBox, scale: number): MarkerBox {
  return { halfW: box.halfW * scale, top: box.top * scale, bottom: box.bottom * scale };
}

function overlaps(ax: number, ay: number, a: MarkerBox, bx: number, by: number, b: MarkerBox, gap: number): boolean {
  return (
    ax - a.halfW - gap < bx + b.halfW &&
    bx - b.halfW - gap < ax + a.halfW &&
    ay - a.top - gap < by + b.bottom &&
    by - b.top - gap < ay + a.bottom
  );
}

const RINGS = 5;
/** Golden angle: spreads profiles that sit exactly on "Você" (no bearing) evenly around it. */
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/**
 * Greedy placement in priority order (the order of `points`): the first profiles (closest, or most
 * affine) always keep a face; later ones are nudged or clustered around them. Deterministic.
 */
export function layoutMap(points: readonly MercatorPoint[], opts: LayoutOptions): MapLayout {
  const { box, maxNudge } = opts;
  const gap = opts.gap ?? 4;
  const size = worldSize(opts.zoom);
  const cell = Math.max(box.halfW * 2, box.top + box.bottom) + gap;
  const grid = new Map<number, number[]>();
  const items: LayoutItem[] = [];
  const itemOf = new Int32Array(points.length).fill(-1);
  const key = (cx: number, cy: number) => cx * 4194304 + cy;

  const avoid = opts.avoid;
  const ax = avoid ? avoid.point.x * size : 0;
  const ay = avoid ? avoid.point.y * size : 0;

  const blockedByAvoid = (x: number, y: number) => (avoid ? overlaps(x, y, box, ax, ay, avoid.box, gap) : false);

  const blockedByItems = (x: number, y: number) => {
    const cx = Math.floor(x / cell);
    const cy = Math.floor(y / cell);
    for (let i = cx - 1; i <= cx + 1; i++) {
      for (let j = cy - 1; j <= cy + 1; j++) {
        const bucket = grid.get(key(i, j));
        if (!bucket) continue;
        for (const idx of bucket) {
          if (overlaps(x, y, box, items[idx].x, items[idx].y, box, gap)) return true;
        }
      }
    }
    return false;
  };

  const free = (x: number, y: number) => !blockedByAvoid(x, y) && !blockedByItems(x, y);

  const add = (x: number, y: number, profile: number) => {
    const idx = items.length;
    items.push({ x, y, members: [profile] });
    itemOf[profile] = idx;
    const k = key(Math.floor(x / cell), Math.floor(y / cell));
    const bucket = grid.get(k);
    if (bucket) bucket.push(idx);
    else grid.set(k, [idx]);
  };

  const nearestItem = (x: number, y: number): number => {
    const reach = Math.ceil((maxNudge + cell) / cell);
    const cx = Math.floor(x / cell);
    const cy = Math.floor(y / cell);
    let best = -1;
    let bestD = Infinity;
    for (let i = cx - reach; i <= cx + reach; i++) {
      for (let j = cy - reach; j <= cy + reach; j++) {
        const bucket = grid.get(key(i, j));
        if (!bucket) continue;
        for (const idx of bucket) {
          const d = (items[idx].x - x) ** 2 + (items[idx].y - y) ** 2;
          if (d < bestD) {
            bestD = d;
            best = idx;
          }
        }
      }
    }
    return best;
  };

  for (let p = 0; p < points.length; p++) {
    let x0 = points[p].x * size;
    let y0 = points[p].y * size;
    const outward = avoid ? (Math.hypot(x0 - ax, y0 - ay) > 0.5 ? Math.atan2(y0 - ay, x0 - ax) : p * GOLDEN) : 0;
    const cos = Math.cos(outward);
    const sin = Math.sin(outward);
    if (blockedByAvoid(x0, y0)) {
      // Someone right next to "Você" keeps their direction and sits just outside the avatar.
      let r = Math.hypot(x0 - ax, y0 - ay);
      while (blockedByAvoid(ax + cos * r, ay + sin * r)) r += 2;
      x0 = ax + cos * r;
      y0 = ay + sin * r;
    }
    if (free(x0, y0)) {
      add(x0, y0, p);
      continue;
    }
    // Try spots on growing rings, each starting with the direction away from "Você",
    // then a little farther along that direction, before giving up and clustering.
    let placed = false;
    for (let ring = 1; ring <= RINGS && !placed; ring++) {
      const r = (maxNudge * ring) / RINGS;
      const steps = 6 + ring * 4;
      for (let s = 0; s < steps && !placed; s++) {
        const side = s % 2 === 0 ? 1 : -1;
        const angle = outward + side * Math.ceil(s / 2) * ((2 * Math.PI) / steps);
        const x = x0 + Math.cos(angle) * r;
        const y = y0 + Math.sin(angle) * r;
        if (free(x, y)) {
          add(x, y, p);
          placed = true;
        }
      }
    }
    for (let k = 1; k <= 3 && !placed; k++) {
      const r = maxNudge * (1 + k / 3);
      const x = x0 + cos * r;
      const y = y0 + sin * r;
      if (free(x, y)) {
        add(x, y, p);
        placed = true;
      }
    }
    if (placed) continue;
    const target = nearestItem(x0, y0);
    if (target >= 0) {
      items[target].members.push(p);
      itemOf[p] = target;
      continue;
    }
    add(x0, y0, p);
  }

  return { zoom: opts.zoom, items, itemOf };
}

/** Indices of items whose position falls inside the rectangle (world px at the layout zoom). */
export function itemsInView(
  items: readonly LayoutItem[],
  centerX: number,
  centerY: number,
  halfW: number,
  halfH: number,
): number[] {
  const out: number[] = [];
  for (let i = 0; i < items.length; i++) {
    if (Math.abs(items[i].x - centerX) <= halfW && Math.abs(items[i].y - centerY) <= halfH) out.push(i);
  }
  return out;
}

/** Camera that opens a cluster: centered on its members, zoomed in enough to split it (at least one step). */
export function clusterTarget(
  points: readonly MercatorPoint[],
  members: readonly number[],
  zoom: number,
  width: number,
  height: number,
  maxZoom: number,
): { x: number; y: number; zoom: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const m of members) {
    minX = Math.min(minX, points[m].x);
    minY = Math.min(minY, points[m].y);
    maxX = Math.max(maxX, points[m].x);
    maxY = Math.max(maxY, points[m].y);
  }
  const spanX = Math.max(1e-12, maxX - minX);
  const spanY = Math.max(1e-12, maxY - minY);
  const fit = Math.log2(Math.min((width * 0.6) / (spanX * 512), (height * 0.6) / (spanY * 512)));
  const next = Math.min(maxZoom, Math.max(zoom + 1, Math.min(fit, zoom + 3)));
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2, zoom: next };
}
