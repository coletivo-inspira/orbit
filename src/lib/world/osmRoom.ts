/**
 * Turns an Overpass `out geom` response into the compact, game-ready map of a
 * city room: meters around the room center (x east, y south), clipped to the
 * room square and simplified. Dependency-free so the build script can import it.
 */

export type AreaKind =
  "parking" | "plaza" | "sand" | "grass" | "park" | "pitch" | "flowerbed" | "forest" | "rock" | "water";
export type RoadKind = "major" | "street" | "service" | "pedestrian" | "path" | "steps";

/** Rings are flat `[x0, y0, x1, y1, ...]` lists without the closing point; several rings fill even-odd. */
export interface RoomArea {
  kind: AreaKind;
  rings: number[][];
}

export interface RoomRoad {
  kind: RoadKind;
  width: number;
  line: number[];
}

export interface RoomBuilding {
  rings: number[][];
  /** Meters above ground. */
  height: number;
  /** Canopies and roofs don't block walking. */
  roof?: true;
}

export interface RoomPoi {
  kind: string;
  name: string;
  x: number;
  y: number;
}

export interface RoomMapData {
  id: string;
  radiusM: number;
  center: { lat: number; lon: number };
  generatedAt: string;
  landmark: { x: number; y: number; rings: number[][] };
  areas: RoomArea[];
  roads: RoomRoad[];
  buildings: RoomBuilding[];
  /** Flat `[x0, y0, x1, y1, ...]` tree positions. */
  trees: number[];
  /** Cable car / gondola lines. */
  cables: number[][];
  pois: RoomPoi[];
}

interface LatLon {
  lat: number;
  lon: number;
}

export type OsmElement =
  | { type: "node"; id: number; lat: number; lon: number; tags?: Record<string, string> }
  | { type: "way"; id: number; geometry?: LatLon[]; tags?: Record<string, string> }
  | {
      type: "relation";
      id: number;
      members?: { type: string; ref: number; role: string; geometry?: LatLon[] }[];
      tags?: Record<string, string>;
    };

export interface BuildRoomOptions {
  id: string;
  center: LatLon;
  radiusM: number;
  landmarkOsmId?: string;
  generatedAt?: string;
}

type Pt = [number, number];

const METERS_PER_DEGREE = 111_320;
const AREA_ORDER: AreaKind[] = [
  "parking",
  "plaza",
  "sand",
  "grass",
  "park",
  "pitch",
  "flowerbed",
  "forest",
  "rock",
  "water",
];
const POI_KINDS = new Set([
  "cafe",
  "bar",
  "pub",
  "restaurant",
  "fast_food",
  "ice_cream",
  "nightclub",
  "cinema",
  "theatre",
  "pharmacy",
  "museum",
  "attraction",
  "viewpoint",
  "artwork",
  "books",
  "bakery",
]);
const MAX_POIS = 24;

export function projector(center: LatLon) {
  const kx = METERS_PER_DEGREE * Math.cos((center.lat * Math.PI) / 180);
  return (p: LatLon): Pt => [(p.lon - center.lon) * kx, (center.lat - p.lat) * METERS_PER_DEGREE];
}

export function classifyArea(tags: Record<string, string>): AreaKind | null {
  const { leisure, landuse, natural, amenity, waterway, place } = tags;
  if (natural === "water" || waterway === "riverbank" || landuse === "basin" || landuse === "reservoir") return "water";
  if (leisure === "swimming_pool" || amenity === "fountain") return "water";
  if (natural === "wood" || landuse === "forest" || natural === "scrub") return "forest";
  if (natural === "bare_rock" || natural === "rock" || natural === "scree") return "rock";
  if (landuse === "flowerbed") return "flowerbed";
  if (leisure === "pitch" || leisure === "track") return "pitch";
  if (leisure === "park" || leisure === "garden" || leisure === "playground" || leisure === "dog_park") return "park";
  if (
    landuse === "grass" ||
    landuse === "meadow" ||
    landuse === "village_green" ||
    landuse === "recreation_ground" ||
    natural === "grassland" ||
    natural === "heath"
  )
    return "grass";
  if (natural === "beach" || natural === "sand") return "sand";
  if (place === "square" || tags["area:highway"] || (tags.highway === "pedestrian" && tags.area === "yes"))
    return "plaza";
  if (amenity === "parking") return "parking";
  return null;
}

export function classifyRoad(tags: Record<string, string>): { kind: RoadKind; width: number } | null {
  const hw = tags.highway;
  if (!hw || tags.area === "yes") return null;
  switch (hw) {
    case "motorway":
    case "trunk":
    case "primary":
    case "secondary":
    case "motorway_link":
    case "trunk_link":
    case "primary_link":
    case "secondary_link":
      return { kind: "major", width: 13 };
    case "tertiary":
    case "tertiary_link":
    case "residential":
    case "unclassified":
    case "living_street":
      return { kind: "street", width: 8 };
    case "service":
      return { kind: "service", width: 5 };
    case "pedestrian":
      return { kind: "pedestrian", width: 8 };
    case "footway":
    case "path":
    case "cycleway":
    case "track":
    case "bridleway":
      return { kind: "path", width: 2.6 };
    case "steps":
      return { kind: "steps", width: 3 };
    default:
      return null;
  }
}

function isBuilding(tags: Record<string, string>): boolean {
  if (!tags.building || tags.building === "no") return false;
  if (tags.location === "underground" || Number(tags.layer) < 0) return false;
  return true;
}

export function buildingHeight(tags: Record<string, string>): number {
  const explicit = parseFloat(tags.height);
  const levels = parseFloat(tags["building:levels"]);
  const h = Number.isFinite(explicit) ? explicit : Number.isFinite(levels) ? levels * 3.2 : 9;
  return Math.max(3, Math.min(60, h));
}

function samePt(a: Pt, b: Pt) {
  return Math.abs(a[0] - b[0]) < 1e-7 && Math.abs(a[1] - b[1]) < 1e-7;
}

/** Joins the member ways of a multipolygon into closed rings. */
export function joinRings(ways: Pt[][]): Pt[][] {
  const pool = ways.filter((w) => w.length >= 2).map((w) => w.slice());
  const rings: Pt[][] = [];
  while (pool.length) {
    let cur = pool.shift()!;
    while (!samePt(cur[0], cur[cur.length - 1])) {
      const end = cur[cur.length - 1];
      const idx = pool.findIndex((w) => samePt(w[0], end) || samePt(w[w.length - 1], end));
      if (idx < 0) break;
      const next = pool.splice(idx, 1)[0];
      cur = cur.concat(samePt(next[0], end) ? next.slice(1) : next.slice(0, -1).reverse());
    }
    if (cur.length >= 4 && samePt(cur[0], cur[cur.length - 1])) rings.push(cur.slice(0, -1));
  }
  return rings;
}

/** Sutherland–Hodgman clip of an open ring against an axis-aligned square of half side `r`. */
export function clipRing(ring: Pt[], r: number): Pt[] {
  let out = ring;
  const edges: [(p: Pt) => boolean, (a: Pt, b: Pt) => Pt][] = [
    [(p) => p[0] >= -r, (a, b) => lerpAt(a, b, 0, -r)],
    [(p) => p[0] <= r, (a, b) => lerpAt(a, b, 0, r)],
    [(p) => p[1] >= -r, (a, b) => lerpAt(a, b, 1, -r)],
    [(p) => p[1] <= r, (a, b) => lerpAt(a, b, 1, r)],
  ];
  for (const [inside, cross] of edges) {
    if (!out.length) break;
    const input = out;
    out = [];
    for (let i = 0; i < input.length; i++) {
      const cur = input[i];
      const prev = input[(i + input.length - 1) % input.length];
      if (inside(cur)) {
        if (!inside(prev)) out.push(cross(prev, cur));
        out.push(cur);
      } else if (inside(prev)) {
        out.push(cross(prev, cur));
      }
    }
  }
  return out;
}

function lerpAt(a: Pt, b: Pt, axis: 0 | 1, value: number): Pt {
  const t = (value - a[axis]) / (b[axis] - a[axis]);
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** Splits a polyline into the runs that fall inside the square (Liang–Barsky per segment). */
export function clipLine(line: Pt[], r: number): Pt[][] {
  const runs: Pt[][] = [];
  let run: Pt[] = [];
  for (let i = 0; i < line.length - 1; i++) {
    const seg = clipSegment(line[i], line[i + 1], r);
    if (!seg) {
      if (run.length > 1) runs.push(run);
      run = [];
      continue;
    }
    const [a, b] = seg;
    if (run.length && samePt(run[run.length - 1], a)) run.push(b);
    else {
      if (run.length > 1) runs.push(run);
      run = [a, b];
    }
  }
  if (run.length > 1) runs.push(run);
  return runs;
}

function clipSegment(a: Pt, b: Pt, r: number): [Pt, Pt] | null {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  let t0 = 0;
  let t1 = 1;
  const checks: [number, number][] = [
    [-dx, a[0] + r],
    [dx, r - a[0]],
    [-dy, a[1] + r],
    [dy, r - a[1]],
  ];
  for (const [p, q] of checks) {
    if (p === 0) {
      if (q < 0) return null;
      continue;
    }
    const t = q / p;
    if (p < 0) {
      if (t > t1) return null;
      if (t > t0) t0 = t;
    } else {
      if (t < t0) return null;
      if (t < t1) t1 = t;
    }
  }
  const at = (t: number): Pt => (t === 0 ? a : t === 1 ? b : [a[0] + dx * t, a[1] + dy * t]);
  return [at(t0), at(t1)];
}

/** Douglas–Peucker simplification. */
export function simplify(points: Pt[], tolerance: number): Pt[] {
  if (points.length <= 2) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop()!;
    let maxD = 0;
    let idx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = segmentDistance(points[i], points[s], points[e]);
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (idx >= 0 && maxD > tolerance) {
      keep[idx] = 1;
      stack.push([s, idx], [idx, e]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function segmentDistance(p: Pt, a: Pt, b: Pt): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2)) : 0;
  return Math.hypot(p[0] - (a[0] + dx * t), p[1] - (a[1] + dy * t));
}

function ringArea(ring: Pt[]): number {
  let a = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

function centroid(ring: Pt[]): Pt {
  let x = 0;
  let y = 0;
  for (const p of ring) {
    x += p[0];
    y += p[1];
  }
  return [x / ring.length, y / ring.length];
}

const round1 = (v: number) => Math.round(v * 10) / 10;
const flatten = (pts: Pt[]) => pts.flatMap(([x, y]) => [round1(x), round1(y)]);

export function buildRoomMap(elements: OsmElement[], opts: BuildRoomOptions): RoomMapData {
  const project = projector(opts.center);
  const r = opts.radiusM;
  const toPts = (geom: LatLon[] | undefined): Pt[] => (geom ?? []).map(project);

  const polygonRings = (el: OsmElement): Pt[][] => {
    if (el.type === "way") {
      const pts = toPts(el.geometry);
      if (pts.length < 4 || !samePt(pts[0], pts[pts.length - 1])) return [];
      return [pts.slice(0, -1)];
    }
    if (el.type === "relation") {
      const ways = (el.members ?? []).filter((m) => m.type === "way" && m.geometry).map((m) => toPts(m.geometry));
      return joinRings(ways);
    }
    return [];
  };

  const clipRings = (rings: Pt[][], tolerance: number): number[][] =>
    rings
      .map((ring) => simplify(clipRing(ring, r), tolerance))
      .filter((ring) => ring.length >= 3 && ringArea(ring) > 0.5)
      .map(flatten);

  let landmark: RoomMapData["landmark"] = { x: 0, y: 0, rings: [] };
  const areas: RoomArea[] = [];
  const roads: RoomRoad[] = [];
  const buildings: RoomBuilding[] = [];
  const trees: number[] = [];
  const cables: number[][] = [];
  const pois: (RoomPoi & { d: number })[] = [];
  const seenPoi = new Set<string>();
  const inside = ([x, y]: Pt) => Math.abs(x) <= r && Math.abs(y) <= r;

  for (const el of elements) {
    const tags = el.tags ?? {};
    const key = `${el.type}/${el.id}`;

    if (key === opts.landmarkOsmId) {
      const rings = polygonRings(el);
      const pt = el.type === "node" ? project(el) : rings.length ? centroid(rings[0]) : ([0, 0] as Pt);
      landmark = { x: round1(pt[0]), y: round1(pt[1]), rings: clipRings(rings, 0.4) };
      continue;
    }

    if (el.type === "node") {
      const p = project(el);
      if (!inside(p)) continue;
      if (tags.natural === "tree") {
        trees.push(round1(p[0]), round1(p[1]));
        continue;
      }
      const kind = tags.amenity ?? tags.tourism ?? tags.shop;
      const name = tags["name:pt"] ?? tags.name;
      if (kind && name && POI_KINDS.has(kind) && !seenPoi.has(name)) {
        seenPoi.add(name);
        pois.push({ kind, name, x: round1(p[0]), y: round1(p[1]), d: Math.hypot(p[0], p[1]) });
      }
      continue;
    }

    if (el.type === "way" && (tags.aerialway === "cable_car" || tags.aerialway === "gondola")) {
      for (const run of clipLine(toPts(el.geometry), r + 20)) cables.push(flatten(simplify(run, 0.4)));
      continue;
    }

    if (el.type === "way" && tags.natural === "tree_row") {
      for (const run of clipLine(toPts(el.geometry), r)) {
        for (let i = 0; i < run.length - 1; i++) {
          const [a, b] = [run[i], run[i + 1]];
          const steps = Math.max(1, Math.floor(Math.hypot(b[0] - a[0], b[1] - a[1]) / 8));
          for (let s = 0; s < steps; s++) {
            trees.push(round1(a[0] + ((b[0] - a[0]) * s) / steps), round1(a[1] + ((b[1] - a[1]) * s) / steps));
          }
        }
      }
      continue;
    }

    if (isBuilding(tags)) {
      const rings = clipRings(polygonRings(el), 0.4);
      if (!rings.length) continue;
      const roof = tags.building === "roof" || tags.building === "canopy";
      buildings.push({ rings, height: buildingHeight(tags), ...(roof ? { roof: true as const } : {}) });
      continue;
    }

    const areaKind = classifyArea(tags);
    if (areaKind) {
      const rings = clipRings(polygonRings(el), 0.6);
      if (rings.length) areas.push({ kind: areaKind, rings });
      continue;
    }

    if (el.type === "way") {
      const road = classifyRoad(tags);
      if (!road) continue;
      for (const run of clipLine(toPts(el.geometry), r + road.width)) {
        const line = simplify(run, 0.4);
        if (line.length >= 2) roads.push({ ...road, line: flatten(line) });
      }
    }
  }

  areas.sort((a, b) => AREA_ORDER.indexOf(a.kind) - AREA_ORDER.indexOf(b.kind));
  const roadOrder: RoadKind[] = ["path", "steps", "service", "pedestrian", "street", "major"];
  roads.sort((a, b) => roadOrder.indexOf(a.kind) - roadOrder.indexOf(b.kind));
  pois.sort((a, b) => a.d - b.d);

  return {
    id: opts.id,
    radiusM: r,
    center: opts.center,
    generatedAt: opts.generatedAt ?? new Date().toISOString(),
    landmark,
    areas,
    roads,
    buildings,
    trees,
    cables,
    pois: pois.slice(0, MAX_POIS).map(({ kind, name, x, y }) => ({ kind, name, x, y })),
  };
}
