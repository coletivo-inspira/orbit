import { describe, expect, it } from "vitest";
import { OBSTACLES, PARK_BOTS, PLAYER_SPAWN } from "@/lib/data/park";
import { fisheye, hexRingPositions } from "./orbitHoneycomb";
import { collidesAt } from "./park2d";

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
