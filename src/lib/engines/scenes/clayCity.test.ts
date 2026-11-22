import { describe, expect, it } from "vitest";
import nyc from "@/lib/data/park-rooms/nyc-stonewall.json";
import paris from "@/lib/data/park-rooms/paris-torre-eiffel.json";
import rio from "@/lib/data/park-rooms/rio-pao-de-acucar.json";
import sf from "@/lib/data/park-rooms/sf-castro.json";
import sp from "@/lib/data/park-rooms/sp-masp-paulista.json";
import tokyo from "@/lib/data/park-rooms/tokyo-nichome.json";
import { CITY_ROOMS, findCityRoom } from "@/lib/data/parkRooms";
import type { RoomMapData } from "@/lib/world/osmRoom";
import { ClayCityScene, PX_PER_M } from "./clayCity";

const DATA: Record<string, RoomMapData> = {
  "paris-torre-eiffel": paris as RoomMapData,
  "rio-pao-de-acucar": rio as RoomMapData,
  "sp-masp-paulista": sp as RoomMapData,
  "nyc-stonewall": nyc as RoomMapData,
  "sf-castro": sf as RoomMapData,
  "tokyo-nichome": tokyo as RoomMapData,
};

function sceneFor(id: string) {
  const room = findCityRoom(id)!;
  const data = DATA[id];
  const px = (v: number) => (v + data.radiusM) * PX_PER_M;
  return { scene: new ClayCityScene(room, data), data, px };
}

function clearPath(scene: ClayCityScene, a: { x: number; y: number }, b: { x: number; y: number }) {
  const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 8);
  for (let i = 0; i <= steps; i++) {
    if (scene.collides(a.x + ((b.x - a.x) * i) / steps, a.y + ((b.y - a.y) * i) / steps, 10)) return false;
  }
  return true;
}

describe("ClayCityScene", () => {
  it("builds in Node, where there is no canvas or Path2D", () => {
    expect(typeof globalThis.Path2D).toBe("undefined");
    expect(() => sceneFor("paris-torre-eiffel")).not.toThrow();
  });

  it("has generated map data for every city room", () => {
    expect(Object.keys(DATA).sort()).toEqual(CITY_ROOMS.map((r) => r.id).sort());
  });

  describe.each(Object.keys(DATA))("%s", (id) => {
    const { scene } = sceneFor(id);
    const room = findCityRoom(id)!;

    it("spawns the player on walkable ground", () => {
      expect(scene.collides(scene.spawn.x, scene.spawn.y, 13)).toBe(false);
    });

    it("places the room's bots on walkable routes they can follow", () => {
      expect(scene.bots).toHaveLength(room.botCount);
      expect(new Set(scene.bots.map((b) => b.id)).size).toBe(room.botCount);
      for (const bot of scene.bots) {
        expect(scene.collides(bot.x, bot.y, 10)).toBe(false);
        expect(bot.waypoints.length).toBeGreaterThan(1);
        bot.waypoints.forEach((wp, i) => {
          expect(scene.collides(wp.x, wp.y, 10)).toBe(false);
          const next = bot.waypoints[(i + 1) % bot.waypoints.length];
          expect(clearPath(scene, wp, next)).toBe(true);
        });
      }
    });

    it("blocks the room's edges", () => {
      expect(scene.collides(4, scene.world.height / 2, 13)).toBe(true);
      expect(scene.collides(scene.world.width / 2, scene.world.height - 4, 13)).toBe(true);
    });

    it("tells the landmark's story when it is tapped", () => {
      const { minX, maxX, minY, maxY } = scene.landmark.hitArea;
      const tap = scene.tap({ x: (minX + maxX) / 2, y: (minY + maxY) / 2 });
      expect(tap?.toast?.message).toBe(room.landmark.fact);
    });
  });

  describe("Paris", () => {
    const { scene, data, px } = sceneFor("paris-torre-eiffel");
    const cx = px(data.landmark.x);
    const cy = px(data.landmark.y);

    it("spawns in front of (south of) the tower", () => {
      expect(scene.spawn.y).toBeGreaterThan(cy + 140);
      expect(Math.abs(scene.spawn.x - cx)).toBeLessThan(120);
    });

    it("lets people walk under the tower but not through its legs", () => {
      expect(scene.collides(cx, cy, 13)).toBe(false);
      expect(scene.collides(cx - 140 + 24, cy + 140 - 24, 13)).toBe(true);
      expect(scene.collides(cx + 140 - 24, cy - 140 + 24, 13)).toBe(true);
    });

    it("keeps signposts out from under the tower", () => {
      const tap = scene.tap({ x: cx, y: cy - 22 });
      expect(tap?.toast?.message).toBe(findCityRoom("paris-torre-eiffel")!.landmark.fact);
    });
  });

  describe("Rio", () => {
    const { scene, data, px } = sceneFor("rio-pao-de-acucar");

    it("surrounds the island with sea", () => {
      expect(scene.collides(40, scene.world.height / 2, 13)).toBe(true);
      expect(scene.collides(scene.world.width / 2, 40, 13)).toBe(true);
    });

    it("spawns next to the cable car station", () => {
      const [x0, y0] = data.cables[0];
      expect(Math.hypot(scene.spawn.x - px(x0), scene.spawn.y - px(y0))).toBeLessThan(800);
    });
  });

  it("opens a toast for a tapped point of interest and walks there", () => {
    const { scene, data, px } = sceneFor("rio-pao-de-acucar");
    const poi = data.pois.find((p) => p.name.includes("Beach Club"))!;
    const tap = scene.tap({ x: px(poi.x), y: px(poi.y) - 22 });
    expect(tap?.toast?.message).toContain(poi.name);
    expect(tap?.walkTo).toBeDefined();
    expect(scene.collides(tap!.walkTo!.x, tap!.walkTo!.y, 13)).toBe(false);
  });
});
