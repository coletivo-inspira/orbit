import { describe, expect, it } from "vitest";
import { ORBIT_PROFILES } from "@/lib/data/profiles";
import { approximateLocation, DEFAULT_LOCATION } from "@/lib/geo/approxPosition";
import { metersToMercator, toMercator, worldSize, type MercatorPoint } from "@/lib/geo/mercator";
import {
  bubbleScale,
  clusterTarget,
  itemsInView,
  layoutMap,
  layoutZoom,
  scaleBox,
  type MapLayout,
  type MarkerBox,
} from "./mapLayout";
import { clampCamera, mapViewFor, VIEW_CELL } from "./orbitMap";

const BOX: MarkerBox = { halfW: 44, top: 37, bottom: 62 };
const YOU: MarkerBox = { halfW: 50, top: 50, bottom: 56 };
const origin = toMercator(DEFAULT_LOCATION);
const points = ORBIT_PROFILES.map((p) => toMercator(approximateLocation(DEFAULT_LOCATION, p.id, p.distanceM)));

function layoutAt(zoom: number, pts: readonly MercatorPoint[] = points, gap = 4): MapLayout {
  const box = scaleBox(BOX, bubbleScale(zoom));
  return layoutMap(pts, { zoom, box, maxNudge: box.top + box.bottom, avoid: { point: origin, box: YOU }, gap });
}

function overlapping(layout: MapLayout, box: MarkerBox): number {
  let count = 0;
  const { items } = layout;
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (
        Math.abs(items[i].x - items[j].x) < box.halfW * 2 &&
        Math.abs(items[i].y - items[j].y) < box.top + box.bottom
      ) {
        count++;
      }
    }
  }
  return count;
}

describe("map layout", () => {
  it("accounts for every profile exactly once", () => {
    for (const zoom of [10, 12.5, 14, 16]) {
      const layout = layoutAt(zoom);
      const seen = layout.items.flatMap((it) => it.members).sort((a, b) => a - b);
      expect(seen).toEqual(points.map((_, i) => i));
      layout.items.forEach((it, idx) => it.members.forEach((m) => expect(layout.itemOf[m]).toBe(idx)));
    }
  });

  it("never lets markers overlap each other or 'Você'", () => {
    for (const zoom of [9.5, 11, 13, 14.25, 17]) {
      const layout = layoutAt(zoom);
      const box = scaleBox(BOX, bubbleScale(zoom));
      expect(overlapping(layout, box)).toBe(0);
      const size = worldSize(zoom);
      for (const it of layout.items) {
        const dx = Math.abs(it.x - origin.x * size);
        const dy = it.y - origin.y * size;
        const clear = dx >= box.halfW + YOU.halfW || dy >= box.top + YOU.bottom || -dy >= box.bottom + YOU.top;
        expect(clear).toBe(true);
      }
    }
  });

  it("keeps distance order: the closest people sit closer to 'Você' than the far ones", () => {
    const zoom = 14;
    const layout = layoutAt(zoom);
    const size = worldSize(zoom);
    const radius = (i: number) => {
      const it = layout.items[layout.itemOf[i]];
      return Math.hypot(it.x - origin.x * size, it.y - origin.y * size);
    };
    const matheus = ORBIT_PROFILES.findIndex((p) => p.distanceM === 180);
    const far = ORBIT_PROFILES.findIndex((p) => p.distanceM > 5000);
    expect(layout.items[layout.itemOf[matheus]].members.length).toBe(1);
    expect(radius(far)).toBeGreaterThan(radius(matheus) * 10);
  });

  it("moves free bubbles by at most the nudge, and leaves sparse ones on their anchor", () => {
    const zoom = 16;
    const layout = layoutAt(zoom);
    const size = worldSize(zoom);
    const box = scaleBox(BOX, bubbleScale(zoom));
    let exact = 0;
    for (const it of layout.items) {
      const lead = points[it.members[0]];
      const d = Math.hypot(it.x - lead.x * size, it.y - lead.y * size);
      if (d < 1e-6) exact++;
      const anchorToYou = Math.hypot(lead.x * size - origin.x * size, lead.y * size - origin.y * size);
      // Bubbles under "Você" first slide out of it, then may be nudged.
      if (anchorToYou > 200) expect(d).toBeLessThanOrEqual((box.top + box.bottom) * 2 + 1e-6);
    }
    expect(exact).toBeGreaterThan(layout.items.length * 0.8);
  });

  it("clusters when zoomed out and shows faces when zoomed in", () => {
    const out = layoutAt(10, points, 4 + 2.5 * 26);
    const near = layoutAt(16);
    expect(out.items.length).toBeLessThan(80);
    expect(out.items.some((it) => it.members.length > 20)).toBe(true);
    expect(near.items.filter((it) => it.members.length > 1).length).toBeLessThan(near.items.length * 0.05);
  });

  it("is deterministic", () => {
    expect(layoutAt(12.75).items).toEqual(layoutAt(12.75).items);
  });

  it("uses quarter-zoom steps rounded down", () => {
    expect(layoutZoom(12.99)).toBe(12.75);
    expect(layoutZoom(13)).toBe(13);
    expect(layoutZoom(13.24)).toBe(13);
    expect(bubbleScale(9)).toBe(0.72);
    expect(bubbleScale(16)).toBe(1);
  });

  it("culls items outside the view rectangle", () => {
    const items = [
      { x: 0, y: 0, members: [0] },
      { x: 500, y: 0, members: [1] },
      { x: 0, y: 900, members: [2] },
    ];
    expect(itemsInView(items, 0, 0, 600, 600)).toEqual([0, 1]);
  });
});

describe("clusterTarget", () => {
  it("zooms at least one step in, centered on the members", () => {
    const members = [0, 1, 2, 3];
    const t = clusterTarget(points, members, 11, 390, 600, 17);
    expect(t.zoom).toBeGreaterThanOrEqual(12);
    expect(t.zoom).toBeLessThanOrEqual(14);
    const xs = members.map((m) => points[m].x);
    expect(t.x).toBeCloseTo((Math.min(...xs) + Math.max(...xs)) / 2, 12);
    expect(clusterTarget(points, [0, 0], 16.5, 390, 600, 17).zoom).toBe(17);
  });
});

describe("map camera", () => {
  it("snaps the view to a grid on the layout zoom", () => {
    const view = mapViewFor({ x: origin.x, y: origin.y, zoom: 13.6 }, 390, 600);
    expect(view.zoom).toBe(13.5);
    expect(view.x % VIEW_CELL).toBe(0);
    expect(Math.abs(view.x - origin.x * worldSize(13.5))).toBeLessThanOrEqual(VIEW_CELL / 2);
    expect(view.halfW).toBeGreaterThan(195);
  });

  it("keeps the camera within reach of 'Você'", () => {
    const max = metersToMercator(30000, DEFAULT_LOCATION.lat);
    const far = clampCamera({ x: origin.x + max * 3, y: origin.y, zoom: 12 }, origin, max);
    expect(far.x - origin.x).toBeCloseTo(max, 12);
    const near = { x: origin.x + max / 2, y: origin.y, zoom: 12 };
    expect(clampCamera(near, origin, max)).toBe(near);
  });
});
