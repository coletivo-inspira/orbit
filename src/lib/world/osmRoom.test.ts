import { describe, expect, it } from "vitest";
import {
  buildingHeight,
  buildRoomMap,
  classifyArea,
  classifyRoad,
  clipLine,
  clipRing,
  joinRings,
  projector,
  simplify,
  type OsmElement,
} from "./osmRoom";

/** At the equator one meter is the same fraction of a degree on both axes. */
const M = 1 / 111_320;
const ll = (x: number, y: number) => ({ lat: -y * M, lon: x * M });
const square = (cx: number, cy: number, half: number) => [
  ll(cx - half, cy - half),
  ll(cx + half, cy - half),
  ll(cx + half, cy + half),
  ll(cx - half, cy + half),
  ll(cx - half, cy - half),
];

describe("projector", () => {
  it("maps east to +x and south to +y, in meters", () => {
    const project = projector({ lat: 0, lon: 0 });
    const [x, y] = project(ll(30, 40));
    expect(x).toBeCloseTo(30, 6);
    expect(y).toBeCloseTo(40, 6);
  });
});

describe("classifyArea", () => {
  it.each([
    [{ natural: "water" }, "water"],
    [{ leisure: "swimming_pool" }, "water"],
    [{ natural: "scrub" }, "forest"],
    [{ natural: "bare_rock" }, "rock"],
    [{ leisure: "park" }, "park"],
    [{ landuse: "grass" }, "grass"],
    [{ leisure: "pitch" }, "pitch"],
    [{ place: "square" }, "plaza"],
    [{ "area:highway": "footway" }, "plaza"],
    [{ highway: "pedestrian", area: "yes" }, "plaza"],
    [{ amenity: "parking" }, "parking"],
    [{ natural: "beach" }, "sand"],
    [{ shop: "bakery" }, null],
  ])("%j → %s", (tags, kind) => {
    expect(classifyArea(tags as Record<string, string>)).toBe(kind);
  });
});

describe("classifyRoad", () => {
  it("buckets highways by width", () => {
    expect(classifyRoad({ highway: "primary" })).toEqual({ kind: "major", width: 13 });
    expect(classifyRoad({ highway: "residential" })).toEqual({ kind: "street", width: 8 });
    expect(classifyRoad({ highway: "service" })?.kind).toBe("service");
    expect(classifyRoad({ highway: "footway" })?.kind).toBe("path");
    expect(classifyRoad({ highway: "steps" })?.kind).toBe("steps");
  });

  it("ignores area highways and unknown kinds", () => {
    expect(classifyRoad({ highway: "pedestrian", area: "yes" })).toBeNull();
    expect(classifyRoad({ highway: "construction" })).toBeNull();
    expect(classifyRoad({ building: "yes" })).toBeNull();
  });
});

describe("buildingHeight", () => {
  it("prefers height, then levels, then a default", () => {
    expect(buildingHeight({ height: "21" })).toBe(21);
    expect(buildingHeight({ "building:levels": "4" })).toBeCloseTo(12.8);
    expect(buildingHeight({})).toBe(9);
  });

  it("clamps to a drawable range", () => {
    expect(buildingHeight({ height: "1" })).toBe(3);
    expect(buildingHeight({ height: "300" })).toBe(60);
  });
});

describe("joinRings", () => {
  it("joins member ways into a closed ring, flipping reversed ways", () => {
    const rings = joinRings([
      [
        [0, 0],
        [10, 0],
        [10, 10],
      ],
      [
        [0, 0],
        [0, 10],
        [10, 10],
      ],
    ]);
    expect(rings).toHaveLength(1);
    expect(rings[0]).toEqual([
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ]);
  });

  it("drops rings that never close", () => {
    expect(
      joinRings([
        [
          [0, 0],
          [5, 0],
          [5, 5],
        ],
      ]),
    ).toEqual([]);
  });
});

describe("clipRing", () => {
  it("cuts a polygon at the room square", () => {
    const clipped = clipRing(
      [
        [-5, -5],
        [20, -5],
        [20, 5],
        [-5, 5],
      ],
      10,
    );
    expect(Math.max(...clipped.map((p) => p[0]))).toBe(10);
    expect(Math.min(...clipped.map((p) => p[0]))).toBe(-5);
  });

  it("returns nothing for a polygon fully outside", () => {
    expect(
      clipRing(
        [
          [20, 20],
          [30, 20],
          [30, 30],
        ],
        10,
      ),
    ).toEqual([]);
  });
});

describe("clipLine", () => {
  it("splits a polyline into the runs inside the square", () => {
    const runs = clipLine(
      [
        [-20, 0],
        [0, 0],
        [0, 20],
        [5, 20],
        [5, 0],
      ],
      10,
    );
    expect(runs).toEqual([
      [
        [-10, 0],
        [0, 0],
        [0, 10],
      ],
      [
        [5, 10],
        [5, 0],
      ],
    ]);
  });
});

describe("simplify", () => {
  it("drops nearly collinear points and keeps corners", () => {
    const line: [number, number][] = [
      [0, 0],
      [5, 0.05],
      [10, 0],
      [10, 10],
    ];
    expect(simplify(line, 0.4)).toEqual([
      [0, 0],
      [10, 0],
      [10, 10],
    ]);
  });
});

describe("buildRoomMap", () => {
  const elements: OsmElement[] = [
    { type: "way", id: 1, tags: { building: "yes", name: "Marco" }, geometry: square(0, 0, 8) },
    { type: "way", id: 2, tags: { building: "yes", "building:levels": "3" }, geometry: square(30, 30, 5) },
    { type: "way", id: 3, tags: { building: "roof" }, geometry: square(-30, 30, 5) },
    { type: "way", id: 4, tags: { building: "yes", location: "underground" }, geometry: square(30, -30, 5) },
    { type: "way", id: 5, tags: { natural: "water" }, geometry: square(-30, -30, 6) },
    { type: "way", id: 6, tags: { leisure: "park" }, geometry: square(0, -40, 6) },
    { type: "way", id: 7, tags: { highway: "residential" }, geometry: [ll(-200, 10), ll(200, 10)] },
    { type: "way", id: 8, tags: { aerialway: "cable_car" }, geometry: [ll(-200, -20), ll(-20, -20)] },
    {
      type: "relation",
      id: 9,
      tags: { type: "multipolygon", landuse: "forest" },
      members: [
        { type: "way", ref: 91, role: "outer", geometry: [ll(10, -45), ll(40, -45), ll(40, -15)] },
        { type: "way", ref: 92, role: "outer", geometry: [ll(10, -45), ll(10, -15), ll(40, -15)] },
      ],
    },
    { type: "node", id: 10, lat: ll(12, 12).lat, lon: ll(12, 12).lon, tags: { natural: "tree" } },
    { type: "node", id: 11, lat: ll(90, 0).lat, lon: ll(90, 0).lon, tags: { natural: "tree" } },
    { type: "node", id: 12, ...ll(20, 0), tags: { amenity: "cafe", name: "Café", "name:pt": "Café Central" } },
    { type: "node", id: 13, ...ll(25, 0), tags: { amenity: "cafe", "name:pt": "Café Central" } },
    { type: "node", id: 14, ...ll(5, 5), tags: { amenity: "bar", name: "Bar Perto" } },
    { type: "node", id: 15, ...ll(5, 5), tags: { shop: "supermarket", name: "Mercado" } },
  ];
  const map = buildRoomMap(elements, {
    id: "teste",
    center: { lat: 0, lon: 0 },
    radiusM: 50,
    landmarkOsmId: "way/1",
    generatedAt: "2026-01-01T00:00:00.000Z",
  });

  it("keeps the landmark out of the regular blocks", () => {
    expect(map.landmark.x).toBeCloseTo(0, 1);
    expect(map.landmark.y).toBeCloseTo(0, 1);
    expect(map.landmark.rings).toHaveLength(1);
    expect(map.buildings).toHaveLength(2);
  });

  it("marks roofs as walkable and reads heights", () => {
    const roof = map.buildings.find((b) => b.roof);
    const block = map.buildings.find((b) => !b.roof);
    expect(roof).toBeDefined();
    expect(block?.height).toBeCloseTo(9.6);
  });

  it("orders areas so water is painted last and joins multipolygons", () => {
    expect(map.areas.map((a) => a.kind)).toEqual(["park", "forest", "water"]);
    expect(map.areas[1].rings[0]).toHaveLength(8);
  });

  it("clips roads to the room and keeps cables", () => {
    expect(map.roads).toHaveLength(1);
    const xs = map.roads[0].line.filter((_, i) => i % 2 === 0);
    expect(Math.min(...xs)).toBe(-58);
    expect(Math.max(...xs)).toBe(58);
    expect(map.cables).toHaveLength(1);
    expect(map.cables[0][0]).toBe(-70);
  });

  it("keeps trees and named points of interest inside the room, nearest first", () => {
    expect(map.trees).toEqual([12, 12]);
    expect(map.pois).toEqual([
      { kind: "bar", name: "Bar Perto", x: 5, y: 5 },
      { kind: "cafe", name: "Café Central", x: 20, y: 0 },
    ]);
  });
});
