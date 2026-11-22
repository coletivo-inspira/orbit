import { describe, expect, it } from "vitest";
import { ORBIT_PROFILES } from "@/lib/data/profiles";
import {
  approximateLocation,
  approximatePlacement,
  DEFAULT_LOCATION,
  DISTANCE_JITTER_MAX,
  hashId,
  MIN_DISTANCE_JITTER_M,
  roundLocation,
} from "./approxPosition";
import { tintMapStyle, type MapStyle } from "./mapStyle";
import {
  bearing,
  destination,
  fromMercator,
  haversine,
  metersPerPixel,
  metersToMercator,
  toMercator,
  worldSize,
  zoomForDistance,
} from "./mercator";

describe("mercator", () => {
  it("round-trips coordinates", () => {
    for (const p of [DEFAULT_LOCATION, { lat: 0, lng: 0 }, { lat: 51.5, lng: -0.12 }, { lat: -33.9, lng: 151.2 }]) {
      const back = fromMercator(toMercator(p));
      expect(back.lat).toBeCloseTo(p.lat, 9);
      expect(back.lng).toBeCloseTo(p.lng, 9);
    }
  });

  it("matches MapLibre's 512 px world and its meters per pixel", () => {
    expect(worldSize(0)).toBe(512);
    expect(metersPerPixel(0, 0)).toBeCloseTo(78271.5, 0);
    expect(zoomForDistance(metersPerPixel(-19.9, 13) * 200, 200, -19.9)).toBeCloseTo(13, 6);
  });

  it("walks the requested distance and bearing", () => {
    for (const [b, d] of [
      [0, 180],
      [90, 5400],
      [225, 27000],
    ]) {
      const to = destination(DEFAULT_LOCATION, b, d);
      expect(haversine(DEFAULT_LOCATION, to)).toBeCloseTo(d, 3);
      const diff = ((bearing(DEFAULT_LOCATION, to) - b + 540) % 360) - 180;
      expect(diff).toBeCloseTo(0, 3);
    }
  });

  it("projects distance proportionally on screen", () => {
    const origin = toMercator(DEFAULT_LOCATION);
    const zoom = 13;
    const px = (m: number) => {
      const p = toMercator(destination(DEFAULT_LOCATION, 60, m));
      return Math.hypot(p.x - origin.x, p.y - origin.y) * worldSize(zoom);
    };
    expect(px(5400) / px(180)).toBeCloseTo(30, 0);
    expect(px(1000)).toBeCloseTo(1000 / metersPerPixel(DEFAULT_LOCATION.lat, zoom), 0);
    expect(metersToMercator(1000, DEFAULT_LOCATION.lat) * worldSize(zoom)).toBeCloseTo(px(1000), 0);
  });
});

describe("approximate positions (privacy)", () => {
  it("is deterministic per id", () => {
    expect(approximatePlacement("p1", 180)).toEqual(approximatePlacement("p1", 180));
    expect(hashId("p1", "rumo")).toBe(hashId("p1", "rumo"));
    expect(hashId("p1", "rumo")).not.toBe(hashId("p2", "rumo"));
  });

  it("never places anyone at the exact distance, and stays close to it", () => {
    for (const p of ORBIT_PROFILES) {
      const { placedM, bearingDeg } = approximatePlacement(p.id, p.distanceM);
      const off = Math.abs(placedM - p.distanceM);
      expect(off).toBeGreaterThanOrEqual(MIN_DISTANCE_JITTER_M - 1e-9);
      expect(off).toBeLessThanOrEqual(Math.max(MIN_DISTANCE_JITTER_M, p.distanceM * DISTANCE_JITTER_MAX) + 1e-9);
      expect(placedM).toBeGreaterThan(0);
      expect(bearingDeg).toBeGreaterThanOrEqual(0);
      expect(bearingDeg).toBeLessThan(360);
    }
  });

  it("spreads profiles around instead of lining them up", () => {
    const sectors = new Set(
      ORBIT_PROFILES.slice(0, 48).map((p) => Math.floor(approximatePlacement(p.id, 1).bearingDeg / 45)),
    );
    expect(sectors.size).toBe(8);
  });

  it("keeps the placed distance on the map, around any origin", () => {
    const origin = { lat: -23.56, lng: -46.66 };
    const p = ORBIT_PROFILES[0];
    const at = approximateLocation(origin, p.id, p.distanceM);
    expect(haversine(origin, at)).toBeCloseTo(approximatePlacement(p.id, p.distanceM).placedM, 3);
  });

  it("rounds the device position to about 100 m", () => {
    const r = roundLocation({ lat: -19.938642, lng: -43.934711 });
    expect(r).toEqual({ lat: -19.939, lng: -43.935 });
    expect(haversine(r, { lat: -19.938642, lng: -43.934711 })).toBeLessThan(80);
  });
});

describe("tintMapStyle", () => {
  it("recolors known layers, hides one-way arrows and drops the missing wood pattern", () => {
    const input: MapStyle = {
      version: 8,
      layers: [
        { id: "background", type: "background", paint: { "background-color": "#000" } },
        { id: "landcover_wood", type: "fill", paint: { "fill-color": "#111", "fill-pattern": "wood-pattern" } },
        { id: "road_oneway", type: "symbol", layout: { "icon-image": "arrow" } },
        { id: "place_city", type: "symbol", paint: { "text-color": "#666" } },
        { id: "railway", type: "line", paint: { "line-color": "#222" } },
      ],
    };
    const style = tintMapStyle(input);
    expect(style.version).toBe(8);
    expect(style.layers[0].paint?.["background-color"]).toBe("#1b2530");
    expect(style.layers[1].paint?.["fill-pattern"]).toBeUndefined();
    expect(style.layers[2].layout?.visibility).toBe("none");
    expect(style.layers[3].paint?.["text-color"]).toBe("#a3b1bf");
    expect(style.layers[4].paint?.["line-color"]).toBe("#222");
  });
});
