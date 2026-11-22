import { describe, expect, it } from "vitest";
import { OBSTACLES, PARK_BOTS, PLAYER_SPAWN } from "@/lib/data/park";
import { cullIndices, fisheye, frontierFor, hexRingPositions, panToReveal, VIEW_CELL, viewFor } from "./orbitHoneycomb";
import { DEFAULT_GRAPH_DISPLAY, labelZoomFor, sanitizeGraphDisplay } from "./graphDisplay";
import { clampZoom, edgeGrowth, fitTransform, MAX_ZOOM, MIN_ZOOM } from "./graphView";
import { proximityOf } from "./park2d";
import { generateRadarMap, RADAR_TILE, radarMapSvg } from "./radarMap";
import { collidesAt } from "./scenes/centralPark";

describe("generateRadarMap", () => {
  it("is a deterministic tile with avenues on its edges, so it wraps without seams", () => {
    const map = generateRadarMap();
    expect(generateRadarMap()).toEqual(map);
    expect(map.minor.length).toBeGreaterThan(10);
    expect(map.major).toContain(`M0 0V${RADAR_TILE}`);
    expect(map.parks).toHaveLength(3);
    expect(radarMapSvg(map)).toContain(`width="${RADAR_TILE}"`);
  });
});

describe("radar virtualization", () => {
  const positions = hexRingPositions(1248, 94);

  it("renders only the bubbles around the view", () => {
    const view = viewFor(0, 0, 390, 600);
    const visible = cullIndices(positions, view.x, view.y, view.radius);
    expect(visible.length).toBeGreaterThan(20);
    expect(visible.length).toBeLessThan(260);
    expect(visible[0]).toBe(0);
  });

  it("snaps the view to a grid so small pans don't re-render", () => {
    expect(viewFor(-10, 20, 390, 600)).toEqual(viewFor(0, 0, 390, 600));
    expect(viewFor(-200, 0, 390, 600).x).toBe(VIEW_CELL);
  });

  it("puts a frontier inside the outer rings for big crowds only", () => {
    expect(frontierFor(hexRingPositions(48, 94), 94)).toBeNull();
    const frontier = frontierFor(positions, 94)!;
    const outer = Math.max(...positions.map((p) => Math.hypot(p.x, p.y)));
    expect(frontier).toBeLessThan(outer);
    expect(positions.some((p) => Math.hypot(p.x, p.y) > frontier)).toBe(true);
  });
});

describe("graph viewport", () => {
  it("clamps zoom", () => {
    expect(clampZoom(10)).toBe(MAX_ZOOM);
    expect(clampZoom(0)).toBe(MIN_ZOOM);
  });

  it("fits and centers the bounds", () => {
    const t = fitTransform({ minX: 0, minY: 0, maxX: 400, maxY: 200 }, 400, 400);
    expect(t.zoom).toBeCloseTo(400 / 520);
    expect(t.panX).toBeCloseTo(-200 * t.zoom);
    expect(t.panY).toBeCloseTo(-100 * t.zoom);
  });
});

describe("panToReveal", () => {
  it("centers inner bubbles", () => {
    expect(panToReveal(104, 0, 240)).toEqual({ x: -104, y: -0 });
  });

  it("stays within the elastic bound for outer rings", () => {
    const outer = hexRingPositions(19, 104)[18];
    const pan = panToReveal(outer.x, outer.y, 240);
    expect(Math.hypot(pan.x, pan.y)).toBeCloseTo(240, 5);
    expect(Math.hypot(outer.x + pan.x, outer.y + pan.y)).toBeLessThan(Math.hypot(outer.x, outer.y));
  });
});

describe("proximityOf", () => {
  it("buckets distances for the people list", () => {
    expect(proximityOf(40)).toBe("perto");
    expect(proximityOf(200)).toBe("caminho");
    expect(proximityOf(900)).toBe("longe");
  });
});

describe("hexRingPositions", () => {
  it("fills the first ring with 6 slots at the given spacing", () => {
    const ring = hexRingPositions(6, 100);
    expect(ring).toHaveLength(6);
    ring.forEach((p) => expect(Math.hypot(p.x, p.y)).toBeCloseTo(100, 5));
  });

  it("returns unique positions for many profiles", () => {
    const positions = hexRingPositions(18, 104);
    const keys = new Set(positions.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`));
    expect(keys.size).toBe(18);
  });
});

describe("fisheye", () => {
  it("shrinks and fades bubbles toward the edge", () => {
    const center = fisheye(0, 300);
    const edge = fisheye(300, 300);
    expect(center.scale).toBeGreaterThan(edge.scale);
    expect(center.opacity).toBeGreaterThan(edge.opacity);
    expect(edge.norm).toBe(1);
  });

  it("keeps watch bubbles bigger at the edge", () => {
    expect(fisheye(300, 300, 0.38).scale).toBeGreaterThan(fisheye(300, 300).scale);
  });
});

describe("graph display settings", () => {
  it("restores stored settings, clamping and dropping bad values", () => {
    expect(sanitizeGraphDisplay(null)).toEqual(DEFAULT_GRAPH_DISPLAY);
    const d = sanitizeGraphDisplay({ arrows: true, nodeSize: 99, repel: "x", linkWidth: 2 });
    expect(d).toMatchObject({ arrows: true, nodeSize: 1.8, repel: 1, linkWidth: 2 });
  });

  it("shows labels sooner with a lower text threshold", () => {
    expect(labelZoomFor(-1)).toBeLessThan(labelZoomFor(0));
    expect(labelZoomFor(1)).toBeGreaterThan(labelZoomFor(0));
  });

  it("grows new timelapse links from 0 to 1", () => {
    expect(edgeGrowth(0)).toBe(0);
    expect(edgeGrowth(200)).toBeGreaterThan(0.5);
    expect(edgeGrowth(10_000)).toBe(1);
  });
});

describe("park collisions", () => {
  it("spawns the player on free ground", () => {
    expect(collidesAt(PLAYER_SPAWN.x, PLAYER_SPAWN.y, 13)).toBe(false);
  });

  it("blocks the fountain and world edges", () => {
    expect(collidesAt(600, 450, 13)).toBe(true);
    expect(collidesAt(5, 300, 13)).toBe(true);
  });

  it("keeps every bot waypoint walkable", () => {
    for (const bot of PARK_BOTS) {
      for (const wp of bot.waypoints) {
        expect(collidesAt(wp.x, wp.y, 12, OBSTACLES), `${bot.name} @ ${wp.x},${wp.y}`).toBe(false);
      }
    }
  });
});
