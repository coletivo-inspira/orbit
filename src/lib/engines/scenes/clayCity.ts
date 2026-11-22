import { PARK_BOTS, type BotDefinition, type Point } from "@/lib/data/park";
import type { ParkRoomDefinition } from "@/lib/data/parkRooms";
import type { AreaKind, RoadKind, RoomMapData, RoomPoi } from "@/lib/world/osmRoom";
import type { ParkScene, SceneProp, SceneTap, ViewRect } from "./types";

/** World pixels per real-world meter: a 100 m radius room is 1600 px wide. */
export const PX_PER_M = 8;
const EDGE = 18;
const TREE_RADIUS = 9;
const PLAYER_RADIUS = 13;
/** Side of a cached ground tile, in world pixels. */
const TILE = 256;
const FONT = "system-ui, sans-serif";
const LABELED_POIS = 2;

interface Rect {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

interface Poly extends Rect {
  rings: number[][];
}

interface Building extends Poly {
  elev: number;
  roof: string;
  wall: string;
  shade: string;
  isRoof: boolean;
}

interface Palette {
  ground: string;
  speckle: string;
  roofs: string[];
  walls?: string[];
  /** The room is a cliff-edged island in the sea (a summit): only the island is walkable. */
  sea?: boolean;
}

const AREA_COLORS: Record<AreaKind, [fill: string, edge: string]> = {
  parking: ["#d5cfdc", "#b9b1c6"],
  plaza: ["#f1e6cf", "#d9c9a8"],
  sand: ["#f5e1a4", "#dcc283"],
  grass: ["#a5dc8c", "#7fbe6b"],
  park: ["#97d47f", "#72b562"],
  pitch: ["#7fca7d", "#5daa5f"],
  flowerbed: ["#f7a8c9", "#e07fa9"],
  forest: ["#7cc274", "#5aa25a"],
  rock: ["#cfc4b6", "#ab9e8e"],
  water: ["#7fcbf0", "#4fa8d8"],
};

const ROAD_STYLE: Record<RoadKind, [fill: string, edge: string]> = {
  path: ["#f1d9a6", "#d6b97f"],
  steps: ["#e8d3ac", "#c4a978"],
  service: ["#c9c3d6", "#aca4bd"],
  pedestrian: ["#eedfc2", "#d1bd98"],
  street: ["#bbb4cc", "#9890ad"],
  major: ["#aca4c0", "#857c9e"],
};
const ROAD_ORDER: RoadKind[] = ["path", "steps", "service", "pedestrian", "street", "major"];

const PALETTES: Record<string, Palette> = {
  "paris-torre-eiffel": {
    ground: "#e9dfc9",
    speckle: "#d6c9ae",
    roofs: ["#a9b7cf", "#9cacc8", "#b6c1d6"],
    walls: ["#f0dfbd", "#ead6b0"],
  },
  "rio-pao-de-acucar": {
    ground: "#6cc0e8",
    speckle: "#5ab2de",
    roofs: ["#f4b393", "#f6d98b", "#efc7a0"],
    sea: true,
  },
  "tokyo-nichome": {
    ground: "#e6dfe8",
    speckle: "#d3c9d8",
    roofs: ["#c3b1e1", "#a7c8f2", "#f2a7c3", "#cfd6e4", "#f6d98b"],
  },
  default: {
    ground: "#ebe0ca",
    speckle: "#d8cab0",
    roofs: ["#f4b393", "#f2a7c3", "#c3b1e1", "#a8dcc1", "#f6d98b", "#a7c8f2"],
  },
};

const POI_EMOJI: Record<string, string> = {
  cafe: "☕",
  bar: "🍸",
  pub: "🍺",
  restaurant: "🍽️",
  fast_food: "🍔",
  ice_cream: "🍦",
  nightclub: "🪩",
  cinema: "🎬",
  theatre: "🎭",
  pharmacy: "💊",
  museum: "🏛️",
  attraction: "⭐",
  viewpoint: "🔭",
  artwork: "🎨",
  books: "📚",
  bakery: "🥐",
};

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shadeHex(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * factor)));
  return `rgb(${ch((n >> 16) & 255)}, ${ch((n >> 8) & 255)}, ${ch(n & 255)})`;
}

function polyOf(rings: number[][]): Poly {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const ring of rings) {
    for (let i = 0; i < ring.length; i += 2) {
      minX = Math.min(minX, ring[i]);
      maxX = Math.max(maxX, ring[i]);
      minY = Math.min(minY, ring[i + 1]);
      maxY = Math.max(maxY, ring[i + 1]);
    }
  }
  return { rings, minX, maxX, minY, maxY };
}

function overlaps(a: Rect, b: Rect, margin = 0): boolean {
  return a.maxX + margin > b.minX && a.minX - margin < b.maxX && a.maxY + margin > b.minY && a.minY - margin < b.maxY;
}

function inRect(x: number, y: number, r: Rect): boolean {
  return x >= r.minX && x <= r.maxX && y >= r.minY && y <= r.maxY;
}

function viewRect(v: ViewRect): Rect {
  return { minX: v.x, maxX: v.x + v.w, minY: v.y, maxY: v.y + v.h };
}

export function pointInRings(x: number, y: number, rings: number[][]): boolean {
  let inside = false;
  for (const ring of rings) {
    const n = ring.length / 2;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = ring[i * 2];
      const yi = ring[i * 2 + 1];
      const xj = ring[j * 2];
      const yj = ring[j * 2 + 1];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

function inPoly(x: number, y: number, p: Poly): boolean {
  return inRect(x, y, p) && pointInRings(x, y, p.rings);
}

function circleHitsPoly(x: number, y: number, r: number, p: Poly): boolean {
  if (x + r < p.minX || x - r > p.maxX || y + r < p.minY || y - r > p.maxY) return false;
  if (pointInRings(x, y, p.rings)) return true;
  for (const ring of p.rings) {
    const n = ring.length / 2;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const ax = ring[j * 2];
      const ay = ring[j * 2 + 1];
      const dx = ring[i * 2] - ax;
      const dy = ring[i * 2 + 1] - ay;
      const len2 = dx * dx + dy * dy;
      const t = len2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2)) : 0;
      if (Math.hypot(x - (ax + dx * t), y - (ay + dy * t)) < r) return true;
    }
  }
  return false;
}

/** Whether a character standing at (x, y) is covered by a footprint extruded from `fromElev` up to `toElev`. */
function behindExtrusion(x: number, y: number, p: Poly, fromElev: number, toElev: number): boolean {
  if (x < p.minX || x > p.maxX || y + 6 + toElev < p.minY || y - 24 + fromElev > p.maxY) return false;
  for (let z = fromElev; z <= toElev + 0.5; z += Math.max(4, (toElev - fromElev) / 6)) {
    for (const body of [-22, -8, 4]) if (pointInRings(x, y + body + z, p.rings)) return true;
  }
  return false;
}

function nearestOnLine(x: number, y: number, line: number[]): { x: number; y: number; d: number } {
  let best = { x: line[0], y: line[1], d: Infinity };
  for (let i = 0; i < line.length - 2; i += 2) {
    const ax = line[i];
    const ay = line[i + 1];
    const dx = line[i + 2] - ax;
    const dy = line[i + 3] - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2)) : 0;
    const px = ax + dx * t;
    const py = ay + dy * t;
    const d = Math.hypot(x - px, y - py);
    if (d < best.d) best = { x: px, y: py, d };
  }
  return best;
}

function ringsPath(rings: number[][], dx = 0, dy = 0): Path2D {
  const path = new Path2D();
  for (const ring of rings) {
    path.moveTo(ring[0] + dx, ring[1] + dy);
    for (let i = 2; i < ring.length; i += 2) path.lineTo(ring[i] + dx, ring[i + 1] + dy);
    path.closePath();
  }
  return path;
}

/** Oriented box of a footprint along its main axis (PCA), as 4 corners. */
function orientedBox(ring: number[]): Point[] {
  const n = ring.length / 2;
  let mx = 0;
  let my = 0;
  for (let i = 0; i < n; i++) {
    mx += ring[i * 2] / n;
    my += ring[i * 2 + 1] / n;
  }
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    const dx = ring[i * 2] - mx;
    const dy = ring[i * 2 + 1] - my;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }
  const angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;
  for (let i = 0; i < n; i++) {
    const dx = ring[i * 2] - mx;
    const dy = ring[i * 2 + 1] - my;
    const u = dx * ux + dy * uy;
    const v = -dx * uy + dy * ux;
    minU = Math.min(minU, u);
    maxU = Math.max(maxU, u);
    minV = Math.min(minV, v);
    maxV = Math.max(maxV, v);
  }
  const at = (u: number, v: number): Point => ({ x: mx + u * ux - v * uy, y: my + u * uy + v * ux });
  return [at(minU, minV), at(maxU, minV), at(maxU, maxV), at(minU, maxV)];
}

/** A wobbly rounded square inset from the room edges, seeded per room. */
function islandOutline(size: number, rand: () => number): Poly {
  const c = size / 2;
  const half = c - 100;
  const p1 = rand() * Math.PI * 2;
  const p2 = rand() * Math.PI * 2;
  const ring: number[] = [];
  for (let i = 0; i < 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const squircle = Math.pow(Math.pow(Math.abs(cos), 5) + Math.pow(Math.abs(sin), 5), -1 / 5);
    const wobble = 1 + 0.045 * Math.sin(3 * a + p1) + 0.025 * Math.sin(8 * a + p2);
    ring.push(c + cos * half * squircle * wobble, c + sin * half * squircle * wobble);
  }
  return polyOf([ring]);
}

/** A point `gap` px in front of (below) the lowest edge of a box. */
function frontOf(box: Point[], gap: number): Point {
  const [a, b] = [...box].sort((p, q) => q.y - p.y);
  return { x: (a.x + b.x) / 2, y: Math.max(a.y, b.y) + gap };
}

/**
 * Static artwork rasterized once into offscreen canvases at the screen's pixel
 * ratio and evicted least-recently-used. Anything used in the current frame
 * is never evicted, so a large view grows the budget instead of thrashing.
 */
class SpriteCache {
  private readonly items = new Map<string, { canvas: HTMLCanvasElement; px: number; frame: number }>();
  private used = 0;
  private scale = 0;
  private frame = 0;

  constructor(private readonly budgetPx: number) {}

  nextFrame() {
    this.frame++;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    key: string,
    x: number,
    y: number,
    w: number,
    h: number,
    paint: (c: CanvasRenderingContext2D) => void,
  ) {
    const scale = ctx.getTransform().a || 1;
    if (scale !== this.scale) {
      this.items.clear();
      this.used = 0;
      this.scale = scale;
    }
    const x0 = Math.floor(x * scale) / scale;
    const y0 = Math.floor(y * scale) / scale;
    let item = this.items.get(key);
    if (item) {
      this.items.delete(key);
    } else {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.ceil((w + x - x0) * scale));
      canvas.height = Math.max(1, Math.ceil((h + y - y0) * scale));
      const c = canvas.getContext("2d");
      if (!c) return;
      c.scale(scale, scale);
      c.translate(-x0, -y0);
      paint(c);
      item = { canvas, px: canvas.width * canvas.height, frame: this.frame };
      this.used += item.px;
      this.evict();
    }
    item.frame = this.frame;
    this.items.set(key, item);
    ctx.drawImage(item.canvas, x0, y0, item.canvas.width / scale, item.canvas.height / scale);
  }

  private evict() {
    for (const [key, item] of this.items) {
      if (this.used <= this.budgetPx || item.frame === this.frame) return;
      this.items.delete(key);
      this.used -= item.px;
    }
  }
}

interface Landmark extends Point {
  rings: number[][];
  /** Tapping inside shows the landmark fact. */
  hitArea: Rect;
  /** Default arrival point: in front of the landmark. */
  front: Point;
  /** Kept free of trees, signposts and blocks so the hand-drawn landmark reads clearly. */
  clearZone: Rect | null;
}

type Area = Poly & { kind: AreaKind };
type Road = { kind: RoadKind; width: number; line: number[] };
type Poi = RoomPoi & { px: number; py: number };

/**
 * A "massinha" (modeling clay) miniature of a real place: streets, blocks,
 * parks, water and trees come from OpenStreetMap; the landmark is hand-drawn.
 * Construction is pure geometry (no canvas), so collisions and spawn can be tested in Node.
 */
export class ClayCityScene implements ParkScene {
  readonly world: { width: number; height: number };
  readonly spawn: Point;
  readonly bots: BotDefinition[];
  readonly background = "#1c2631";
  readonly cameraAnchorY = 0.66;
  readonly props: SceneProp[] = [];

  private readonly palette: Palette;
  private readonly blockers: Poly[] = [];
  private readonly island: Poly | null = null;
  private readonly treeCircles: Point[] = [];
  private readonly landmarkBlockers: Poly[] = [];
  private readonly buildings: Building[] = [];
  private readonly areas: Area[] = [];
  private readonly roads: Road[] = [];
  private readonly cables: number[][];
  private readonly pois: Poi[];
  private readonly speckles: Point[] = [];
  private readonly rockStreaks: (Point & { a: number })[] = [];
  private readonly seaWaves: Point[] = [];
  private readonly boatLane: { y: number; x0: number; x1: number } | null = null;
  readonly landmark: Landmark;
  private readonly tiles = new SpriteCache(4_000_000);
  private readonly sprites = new SpriteCache(5_000_000);
  private staticPaths: {
    areas: Path2D[];
    roads: Map<RoadKind, Path2D>;
    shadows: Path2D[];
    island: Path2D | null;
  } | null = null;
  private waterPaths: Map<Area, Path2D> | null = null;

  constructor(
    readonly room: ParkRoomDefinition,
    data: RoomMapData,
  ) {
    const r = data.radiusM;
    const size = r * 2 * PX_PER_M;
    const px = (v: number) => (v + r) * PX_PER_M;
    const ringsPx = (rings: number[][]) => rings.map((ring) => ring.map(px));
    const rand = mulberry32(hashString(room.id));

    this.world = { width: size, height: size };
    this.palette = PALETTES[room.id] ?? PALETTES.default;

    for (const a of data.areas) {
      const poly = { ...polyOf(ringsPx(a.rings)), kind: a.kind };
      this.areas.push(poly);
      if (a.kind === "water") this.blockers.push(poly);
    }
    if (this.palette.sea) this.island = islandOutline(size, rand);
    for (const road of data.roads) this.roads.push({ ...road, line: road.line.map(px) });
    this.cables = data.cables.map((c) => c.map(px));

    this.landmark = this.locateLandmark(
      { x: px(data.landmark.x), y: px(data.landmark.y) },
      ringsPx(data.landmark.rings),
    );
    const clear = this.landmark.clearZone;

    data.buildings.forEach((b, i) => {
      const poly = polyOf(ringsPx(b.rings));
      if (clear && !b.roof && inRect((poly.minX + poly.maxX) / 2, (poly.minY + poly.maxY) / 2, clear)) return;
      const roof = this.palette.roofs[(hashString(`${room.id}:${i}`) >>> 3) % this.palette.roofs.length];
      const wallBase = this.palette.walls ? this.palette.walls[i % this.palette.walls.length] : null;
      const building: Building = {
        ...poly,
        elev: b.roof ? 20 : Math.max(14, Math.min(58, b.height * PX_PER_M * 0.32)),
        roof,
        wall: wallBase ? shadeHex(wallBase, 0.96) : shadeHex(roof, 0.8),
        shade: wallBase ? shadeHex(wallBase, 0.8) : shadeHex(roof, 0.66),
        isRoof: !!b.roof,
      };
      this.buildings.push(building);
      if (!b.roof) this.blockers.push(poly);
    });

    for (let i = 0; i < data.trees.length; i += 2) {
      const t = { x: px(data.trees[i]), y: px(data.trees[i + 1]) };
      if (!clear || !inRect(t.x, t.y, clear)) this.treeCircles.push(t);
    }
    this.addLandmarkProps();
    this.scatterForestTrees(rand);

    if (this.palette.sea) {
      for (let i = 0; i < 900 && this.seaWaves.length < 140; i++) {
        const p = { x: rand() * size, y: rand() * size };
        if (!this.onLand(p.x, p.y)) this.seaWaves.push(p);
      }
      this.boatLane = this.findBoatLane();
    } else {
      for (let i = 0; i < 420; i++) this.speckles.push({ x: rand() * size, y: rand() * size });
    }
    for (const a of this.areas) {
      if (a.kind !== "rock") continue;
      const count = Math.min(160, ((a.maxX - a.minX) * (a.maxY - a.minY)) / 9000);
      for (let i = 0; i < count; i++) {
        const p = { x: a.minX + rand() * (a.maxX - a.minX), y: a.minY + rand() * (a.maxY - a.minY), a: rand() };
        if (pointInRings(p.x, p.y, a.rings)) this.rockStreaks.push(p);
      }
    }

    this.pois = data.pois
      .map((p) => ({ ...p, px: px(p.x), py: px(p.y) }))
      .filter((p) => !inRect(p.px, p.py, clear ?? this.landmark.hitArea));

    this.buildings.forEach((b, i) => {
      const top = b.minY - b.elev - 4;
      this.props.push({
        y: b.maxY,
        minX: b.minX - 3,
        maxX: b.maxX + 3,
        minY: top,
        draw: (ctx) =>
          this.sprites.draw(ctx, `b${i}`, b.minX - 3, top, b.maxX - b.minX + 6, b.maxY - top + 3, (c) =>
            paintBuilding(c, b),
          ),
        hides: (x, y) => behindExtrusion(x, y, b, b.isRoof ? b.elev - 4 : 0, b.elev),
      });
    });
    this.treeCircles.forEach((t, i) => {
      const variant = i % TREE_GREENS.length;
      this.props.push({
        y: t.y,
        minX: t.x - 20,
        maxX: t.x + 22,
        minY: t.y - 38,
        draw: (ctx) =>
          this.sprites.draw(ctx, `t${variant}`, t.x - 20, t.y - 38, 42, 50, (c) => drawClayTree(c, t.x, t.y, variant)),
        hides: (x, y) => Math.abs(x - t.x) < 16 && y > t.y - 34,
      });
    });
    for (const p of this.pois) {
      const emoji = POI_EMOJI[p.kind] ?? "📍";
      this.props.push({
        y: p.py,
        minX: p.px - 14,
        maxX: p.px + 14,
        minY: p.py - 40,
        draw: (ctx) =>
          this.sprites.draw(ctx, `s${emoji}`, p.px - 14, p.py - 38, 28, 44, (c) => drawSignpost(c, p.px, p.py, emoji)),
      });
    }

    const custom = room.spawn ? { x: px(room.spawn.x), y: px(room.spawn.y) } : null;
    this.spawn = this.findWalkable(custom ?? this.landmark.front, 600) ?? { x: size / 2, y: size / 2 };
    this.bots = this.placeBots(rand);
  }

  collides(x: number, y: number, radius: number): boolean {
    const { width, height } = this.world;
    if (x < EDGE || x > width - EDGE || y < EDGE || y > height - EDGE) return true;
    if (this.palette.sea && !this.onLand(x, y)) return true;
    for (const t of this.treeCircles) {
      if (Math.abs(t.x - x) < 40 && Math.abs(t.y - y) < 40 && Math.hypot(t.x - x, t.y - y) < TREE_RADIUS + radius)
        return true;
    }
    for (const p of this.blockers) if (circleHitsPoly(x, y, radius, p)) return true;
    for (const p of this.landmarkBlockers) if (circleHitsPoly(x, y, radius, p)) return true;
    return false;
  }

  tap(pt: Point): SceneTap | null {
    for (const p of this.pois) {
      if (Math.hypot(pt.x - p.px, pt.y - (p.py - 22)) < 24) {
        const walkTo = this.findWalkable({ x: p.px, y: p.py + 30 }, 120);
        return {
          toast: { message: `${POI_EMOJI[p.kind] ?? "📍"} ${p.name}`, type: "info" },
          walkTo: walkTo ?? undefined,
        };
      }
    }
    if (inRect(pt.x, pt.y, this.landmark.hitArea)) {
      return { toast: { message: this.room.landmark.fact, type: "info" } };
    }
    return null;
  }

  // ------------------------------------------------------------ generation

  private onLand(x: number, y: number): boolean {
    return !this.island || inPoly(x, y, this.island);
  }

  private locateLandmark(center: Point, rings: number[][]): Landmark {
    const kind = this.room.landmark.kind;
    const box = rings[0] ? orientedBox(rings[0]) : null;
    if (kind === "eiffel") {
      const reach = EIFFEL.half + 30;
      return {
        ...center,
        rings,
        hitArea: {
          minX: center.x - EIFFEL.half,
          maxX: center.x + EIFFEL.half,
          minY: center.y - EIFFEL.half - EIFFEL.height,
          maxY: center.y + EIFFEL.half,
        },
        front: { x: center.x, y: center.y + EIFFEL.half + 80 },
        clearZone: { minX: center.x - reach, maxX: center.x + reach, minY: center.y - reach, maxY: center.y + reach },
      };
    }
    if (kind === "museum-frame" && box) {
      const r = polyOf([box.flatMap((p) => [p.x, p.y])]);
      return {
        ...center,
        rings,
        hitArea: { ...r, minY: r.minY - MASP_TOP },
        front: frontOf(box, 100),
        clearZone: { minX: r.minX - 6, maxX: r.maxX + 6, minY: r.minY - 6, maxY: r.maxY + 6 },
      };
    }
    if (kind === "neon-sign") {
      const spot = this.neonSpot(center);
      return {
        ...spot,
        rings,
        hitArea: { minX: spot.x - 92, maxX: spot.x + 92, minY: spot.y - 130, maxY: spot.y + 4 },
        front: { x: spot.x, y: spot.y + 24 },
        clearZone: null,
      };
    }
    if (kind === "peak") {
      return {
        ...center,
        rings,
        hitArea: { minX: center.x - 60, maxX: center.x + 60, minY: center.y - 100, maxY: center.y + 36 },
        front: { x: center.x, y: center.y + 90 },
        clearZone: { minX: center.x - 80, maxX: center.x + 80, minY: center.y - 70, maxY: center.y + 60 },
      };
    }
    return {
      ...center,
      rings,
      hitArea: { minX: center.x - 30, maxX: center.x + 90, minY: center.y - 240, maxY: center.y + 10 },
      front: { x: center.x, y: center.y + 90 },
      clearZone: null,
    };
  }

  /** The Ni-chōme arch spans the street nearest to the neighborhood center. */
  private neonSpot(center: Point): Point {
    let best: { x: number; y: number; d: number } | null = null;
    for (const road of this.roads) {
      if (road.kind === "major") continue;
      const p = nearestOnLine(center.x, center.y, road.line);
      const d = p.d + (road.kind === "street" || road.kind === "pedestrian" ? 0 : 60);
      if (!best || d < best.d) best = { ...p, d };
    }
    return best ? { x: best.x, y: best.y } : center;
  }

  private scatterForestTrees(rand: () => number) {
    const spacing = 64;
    const clear = this.landmark.clearZone;
    let added = 0;
    for (const a of this.areas) {
      if (a.kind !== "forest" && a.kind !== "park") continue;
      const step = a.kind === "forest" ? spacing : spacing * 2.2;
      for (let y = a.minY + step / 2; y < a.maxY; y += step) {
        for (let x = a.minX + step / 2; x < a.maxX; x += step) {
          if (added > 260) return;
          const tx = x + (rand() - 0.5) * step * 0.7;
          const ty = y + (rand() - 0.5) * step * 0.7;
          if (!pointInRings(tx, ty, a.rings) || !this.onLand(tx, ty)) continue;
          if (clear && inRect(tx, ty, { ...clear, minY: clear.minY - 40, maxY: clear.maxY + 40 })) continue;
          if (this.roads.some((r) => nearestOnLine(tx, ty, r.line).d < (r.width * PX_PER_M) / 2 + 16)) continue;
          if (this.blockers.some((b) => circleHitsPoly(tx, ty, 16, b))) continue;
          if (this.buildings.some((b) => b.isRoof && circleHitsPoly(tx, ty, 16, b))) continue;
          if (this.treeCircles.some((t) => Math.hypot(t.x - tx, t.y - ty) < 30)) continue;
          this.treeCircles.push({ x: tx, y: ty });
          added++;
        }
      }
    }
  }

  private addLandmarkProps() {
    const lm = this.landmark;
    const kind = this.room.landmark.kind;
    const ring = lm.rings[0];

    if (kind === "eiffel") {
      const tower = eiffelTower(lm);
      for (const leg of tower.legs) this.landmarkBlockers.push(polyOf([leg]));
      const b = tower.bounds;
      this.props.push({
        y: lm.y + EIFFEL.half,
        ...b,
        draw: (ctx, time) => {
          this.sprites.draw(ctx, "eiffel", b.minX, b.minY, b.maxX - b.minX, b.maxY - b.minY, tower.paint);
          tower.lights(ctx, time);
        },
        hides: (x, y) => Math.abs(x - lm.x) < EIFFEL.half + 12 && y > lm.y - EIFFEL.half - EIFFEL.height * 0.45,
      });
      return;
    }
    if (kind === "museum-frame" && ring) {
      const box = orientedBox(ring);
      const masp = museum(box);
      for (const pillar of masp.pillars) this.landmarkBlockers.push(polyOf([pillar]));
      const b = masp.bounds;
      const footprint = polyOf([box.flatMap((p) => [p.x, p.y])]);
      this.props.push({
        y: footprint.maxY,
        ...b,
        draw: (ctx) => this.sprites.draw(ctx, "masp", b.minX, b.minY, b.maxX - b.minX, b.maxY - b.minY, masp.paint),
        hides: (x, y) => behindExtrusion(x, y, footprint, MASP_BOTTOM, MASP_TOP),
      });
      return;
    }
    if (kind === "peak") {
      this.landmarkBlockers.push(
        polyOf([[lm.x - 34, lm.y - 16, lm.x + 34, lm.y - 16, lm.x + 34, lm.y + 12, lm.x - 34, lm.y + 12]]),
      );
      const label = `${this.room.landmark.label} · 396 m`;
      this.props.push({
        y: lm.y + 12,
        minX: lm.x - 90,
        maxX: lm.x + 90,
        minY: lm.y - 110,
        draw: (ctx) =>
          this.sprites.draw(ctx, "peak", lm.x - 90, lm.y - 110, 180, 152, (c) => drawSummit(c, lm.x, lm.y, label)),
      });
      return;
    }
    if (kind === "neon-sign") {
      this.props.push({
        y: lm.y,
        minX: lm.x - 110,
        maxX: lm.x + 110,
        minY: lm.y - 150,
        draw: (ctx, time) => drawNeonArch(ctx, lm.x, lm.y, time),
        hides: (x, y) => Math.abs(x - lm.x) < 96 && y > lm.y - 100,
      });
      return;
    }
    const host = this.buildings.find((b) => !b.isRoof && pointInRings(lm.x, lm.y, b.rings));
    const lift = host ? host.elev : 0;
    const tall = host ? 150 : 230;
    this.props.push({
      y: host ? host.maxY + 1 : lm.y,
      minX: lm.x - 10,
      maxX: lm.x + 130,
      minY: lm.y - lift - tall - 10,
      draw: (ctx, time) => drawRainbowFlag(ctx, lm.x, lm.y - lift, tall, time),
    });
  }

  private findBoatLane(): { y: number; x0: number; x1: number } | null {
    const { width, height } = this.world;
    for (let y = height - 30; y > height / 2; y -= 24) {
      let run = 0;
      let best = { x0: 0, x1: 0 };
      for (let x = 40; x < width - 40; x += 16) {
        if (this.onLand(x, y)) run = 0;
        else if (++run * 16 > best.x1 - best.x0) best = { x0: x - run * 16, x1: x };
      }
      if (best.x1 - best.x0 > 360) return { y, ...best };
    }
    return null;
  }

  private findWalkable(from: Point, maxDist: number): Point | null {
    if (!this.collides(from.x, from.y, PLAYER_RADIUS + 2)) return from;
    for (let d = 12; d <= maxDist; d += 12) {
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) {
        const p = { x: from.x + Math.cos(a) * d, y: from.y + Math.sin(a) * d };
        if (!this.collides(p.x, p.y, PLAYER_RADIUS + 2)) return p;
      }
    }
    return null;
  }

  private clearPath(a: Point, b: Point, radius = 13): boolean {
    const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 10);
    for (let i = 1; i <= steps; i++) {
      if (this.collides(a.x + ((b.x - a.x) * i) / steps, a.y + ((b.y - a.y) * i) / steps, radius)) return false;
    }
    return true;
  }

  private randomWalkable(rand: () => number, around: Point, dist: number, reachableFrom?: Point): Point | null {
    for (let i = 0; i < 80; i++) {
      const a = rand() * Math.PI * 2;
      const d = dist * (0.35 + rand() * 0.65);
      const p = { x: around.x + Math.cos(a) * d, y: around.y + Math.sin(a) * d };
      if (this.collides(p.x, p.y, 14)) continue;
      if (reachableFrom && !this.clearPath(reachableFrom, p)) continue;
      return p;
    }
    return null;
  }

  /** Bots walk a small loop of waypoints with a clear line between each, so none gets stuck on a wall. */
  private placeBots(rand: () => number): BotDefinition[] {
    const pool = [...PARK_BOTS].sort(() => rand() - 0.5).slice(0, this.room.botCount);
    const lines = this.room.botLines;
    return pool.map((b, i) => {
      const start = this.randomWalkable(rand, this.spawn, 420) ?? this.spawn;
      const waypoints = [start];
      for (let k = 0; k < 2; k++) {
        const prev = waypoints[waypoints.length - 1];
        const next = this.randomWalkable(rand, prev, 220, prev);
        if (next && (k === 0 || this.clearPath(next, start))) waypoints.push(next);
      }
      if (waypoints.length === 2) waypoints.push(start);
      return {
        ...b,
        x: start.x,
        y: start.y,
        pauseTimer: 0.6 + rand() * 1.8,
        waypoints,
        lines: lines.map((_, k) => lines[(i + k) % lines.length]),
        foundLines: undefined,
      };
    });
  }

  // ------------------------------------------------------------ drawing

  private ensureStaticPaths() {
    if (this.staticPaths) return this.staticPaths;
    const roads = new Map<RoadKind, Path2D>();
    for (const r of this.roads) {
      const path = roads.get(r.kind) ?? new Path2D();
      path.moveTo(r.line[0], r.line[1]);
      for (let i = 2; i < r.line.length; i += 2) path.lineTo(r.line[i], r.line[i + 1]);
      roads.set(r.kind, path);
    }
    this.staticPaths = {
      areas: this.areas.map((a) => ringsPath(a.rings)),
      roads,
      shadows: this.buildings.map((b) => ringsPath(b.rings, 7, 5)),
      island: this.island ? ringsPath(this.island.rings) : null,
    };
    return this.staticPaths;
  }

  drawGround(ctx: CanvasRenderingContext2D, view: ViewRect, time: number): void {
    this.tiles.nextFrame();
    this.sprites.nextFrame();
    const { width, height } = this.world;
    ctx.fillStyle = "rgba(6, 10, 16, 0.5)";
    ctx.fillRect(10, 14, width, height);

    const c0 = Math.max(0, Math.floor(view.x / TILE));
    const c1 = Math.min(Math.ceil(width / TILE) - 1, Math.floor((view.x + view.w) / TILE));
    const r0 = Math.max(0, Math.floor(view.y / TILE));
    const r1 = Math.min(Math.ceil(height / TILE) - 1, Math.floor((view.y + view.h) / TILE));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const rect = {
          x: c * TILE,
          y: r * TILE,
          w: Math.min(TILE, width - c * TILE),
          h: Math.min(TILE, height - r * TILE),
        };
        this.tiles.draw(ctx, `${c},${r}`, rect.x, rect.y, rect.w, rect.h, (t) => this.paintStatic(t, rect));
      }
    }
    this.drawLiveWater(ctx, view, time);
  }

  /** Everything flat and still: ground, areas, roads and block shadows. */
  private paintStatic(ctx: CanvasRenderingContext2D, tile: ViewRect) {
    const paths = this.ensureStaticPaths();
    const area = viewRect(tile);
    ctx.beginPath();
    ctx.rect(tile.x, tile.y, tile.w, tile.h);
    ctx.clip();
    ctx.fillStyle = this.palette.ground;
    ctx.fillRect(tile.x, tile.y, tile.w, tile.h);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    ctx.fillStyle = this.palette.speckle;
    for (const s of this.speckles) {
      if (!inRect(s.x, s.y, { ...area, minX: area.minX - 3, maxX: area.maxX + 3 })) continue;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    if (paths.island) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
      ctx.lineWidth = 18;
      ctx.stroke(paths.island);
      ctx.translate(0, 26);
      ctx.fillStyle = "#8f8273";
      ctx.fill(paths.island);
      ctx.translate(0, -26);
      ctx.strokeStyle = "rgba(90, 76, 64, 0.5)";
      ctx.lineWidth = 3;
      ctx.stroke(paths.island);
      ctx.clip(paths.island);
    }

    this.areas.forEach((a, i) => {
      if (!overlaps(a, area, 4)) return;
      const [fill, edge] = AREA_COLORS[a.kind];
      ctx.fillStyle = fill;
      ctx.fill(paths.areas[i], "evenodd");
      ctx.strokeStyle = edge;
      ctx.lineWidth = 3;
      ctx.stroke(paths.areas[i]);
    });

    ctx.strokeStyle = "rgba(120, 104, 90, 0.4)";
    ctx.lineWidth = 2;
    for (const s of this.rockStreaks) {
      if (!inRect(s.x, s.y, { minX: area.minX - 20, maxX: area.maxX + 20, minY: area.minY - 10, maxY: area.maxY + 10 }))
        continue;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 10 + s.a * 8, Math.PI * (1.1 + s.a * 0.2), Math.PI * (1.6 + s.a * 0.2));
      ctx.stroke();
    }

    for (const kind of ROAD_ORDER) {
      const path = paths.roads.get(kind);
      if (!path) continue;
      ctx.strokeStyle = ROAD_STYLE[kind][1];
      ctx.lineWidth = this.roadWidth(kind) + 5;
      ctx.stroke(path);
    }
    for (const kind of ROAD_ORDER) {
      const path = paths.roads.get(kind);
      if (!path) continue;
      const w = this.roadWidth(kind);
      ctx.strokeStyle = ROAD_STYLE[kind][0];
      ctx.lineWidth = w;
      ctx.stroke(path);
      if (kind === "steps") {
        ctx.setLineDash([3, 6]);
        ctx.strokeStyle = ROAD_STYLE.steps[1];
        ctx.lineWidth = w * 0.8;
        ctx.stroke(path);
        ctx.setLineDash([]);
      }
      if (kind === "major" || kind === "street") {
        ctx.setLineDash(kind === "major" ? [18, 16] : [10, 18]);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
        ctx.lineWidth = kind === "major" ? 3 : 2;
        ctx.stroke(path);
        ctx.setLineDash([]);
      }
    }

    this.buildings.forEach((b, i) => {
      if (!overlaps(b, area, 10)) return;
      ctx.fillStyle = b.isRoof ? "rgba(76, 56, 74, 0.1)" : "rgba(76, 56, 74, 0.16)";
      ctx.fill(paths.shadows[i]);
    });
  }

  private roadWidth(kind: RoadKind): number {
    return (this.roads.find((r) => r.kind === kind)?.width ?? 3) * PX_PER_M;
  }

  /** Ripples and the sailboat move every frame, on top of the cached ground. */
  private drawLiveWater(ctx: CanvasRenderingContext2D, view: ViewRect, time: number) {
    const area = viewRect(view);
    ctx.lineCap = "round";
    for (const a of this.areas) {
      if (a.kind !== "water" || !overlaps(a, area)) continue;
      this.waterPaths ??= new Map();
      let path = this.waterPaths.get(a);
      if (!path) {
        path = ringsPath(a.rings);
        this.waterPaths.set(a, path);
      }
      ctx.save();
      ctx.clip(path, "evenodd");
      ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
      ctx.lineWidth = 2.5;
      for (let k = 0; k < 6; k++) {
        const wx = a.minX + ((k * 97 + time * 14) % Math.max(1, a.maxX - a.minX));
        const wy = a.minY + ((k * 61) % Math.max(1, a.maxY - a.minY));
        ctx.beginPath();
        ctx.arc(wx, wy, 7, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      }
      ctx.restore();
    }
    if (!this.palette.sea) return;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 2.5;
    this.seaWaves.forEach((w, i) => {
      if (!inRect(w.x, w.y, { ...area, minX: area.minX - 12, maxX: area.maxX + 12 })) return;
      const drift = Math.sin(time * 0.8 + i) * 5;
      ctx.beginPath();
      ctx.arc(w.x + drift, w.y, 8, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    });
    const lane = this.boatLane;
    if (lane) {
      const span = lane.x1 - lane.x0;
      const phase = (time * 9) % (span * 2);
      const x = lane.x0 + (phase < span ? phase : span * 2 - phase);
      if (x > view.x - 40 && x < view.x + view.w + 40 && lane.y > view.y - 60 && lane.y < view.y + view.h + 20) {
        drawSailboat(ctx, x, lane.y + Math.sin(time * 2) * 1.5, phase < span);
      }
    }
  }

  drawOverlay(ctx: CanvasRenderingContext2D, _view: ViewRect, time: number, player: Point): void {
    for (const cable of this.cables) drawCable(ctx, cable, time);
    const near = this.pois
      .map((p) => ({ p, d: Math.hypot(player.x - p.px, player.y - p.py) }))
      .filter((n) => n.d < 150)
      .sort((a, b) => a.d - b.d)
      .slice(0, LABELED_POIS);
    ctx.font = `700 10px ${FONT}`;
    ctx.textAlign = "center";
    for (const { p } of near) {
      const label = p.name.length > 26 ? `${p.name.slice(0, 25)}…` : p.name;
      const w = ctx.measureText(label).width + 14;
      ctx.fillStyle = "rgba(255, 250, 240, 0.95)";
      ctx.strokeStyle = "rgba(70, 48, 72, 0.35)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(p.px - w / 2, p.py - 58, w, 17, 8.5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#3b2a45";
      ctx.fillText(label, p.px, p.py - 46);
    }
  }
}

// ---------------------------------------------------------------- clay props

const TREE_GREENS = ["#5fb562", "#6cc070", "#57a85c", "#7cc46a"];

function paintBuilding(ctx: CanvasRenderingContext2D, b: Building) {
  const top = ringsPath(b.rings, 0, -b.elev);
  ctx.lineJoin = "round";
  if (b.isRoof) {
    ctx.fillStyle = "#e3c9a3";
    ctx.fill(top, "evenodd");
    ctx.save();
    ctx.clip(top, "evenodd");
    ctx.strokeStyle = "rgba(140, 100, 66, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = b.minX - (b.maxY - b.minY); x < b.maxX; x += 9) {
      ctx.moveTo(x, b.maxY - b.elev);
      ctx.lineTo(x + (b.maxY - b.minY), b.minY - b.elev);
    }
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = "#a9875f";
    ctx.lineWidth = 2.5;
    ctx.stroke(top);
    return;
  }
  const lit = new Path2D();
  const shade = new Path2D();
  for (const ring of b.rings) {
    const n = ring.length / 2;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const [ax, ay, bx, by] = [ring[i * 2], ring[i * 2 + 1], ring[j * 2], ring[j * 2 + 1]];
      const target = bx - ax > 0 ? lit : shade;
      target.moveTo(ax, ay);
      target.lineTo(bx, by);
      target.lineTo(bx, by - b.elev);
      target.lineTo(ax, ay - b.elev);
      target.closePath();
    }
  }
  ctx.fillStyle = b.wall;
  ctx.fill(lit);
  ctx.fillStyle = b.shade;
  ctx.fill(shade);
  ctx.strokeStyle = "rgba(70, 48, 72, 0.22)";
  ctx.lineWidth = 1.5;
  ctx.stroke(lit);
  ctx.stroke(shade);
  ctx.fillStyle = b.roof;
  ctx.fill(top, "evenodd");
  ctx.strokeStyle = "rgba(70, 48, 72, 0.4)";
  ctx.lineWidth = 2.5;
  ctx.stroke(top);
  ctx.translate(-1.5, -1.5);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
  ctx.lineWidth = 1.5;
  ctx.stroke(top);
  ctx.translate(1.5, 1.5);
}

function drawClayTree(ctx: CanvasRenderingContext2D, x: number, y: number, variant: number) {
  ctx.fillStyle = "rgba(70, 50, 60, 0.2)";
  ctx.beginPath();
  ctx.ellipse(x + 5, y + 3, 15, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#9a6b47";
  ctx.beginPath();
  ctx.roundRect(x - 3, y - 12, 6, 14, 3);
  ctx.fill();
  const green = TREE_GREENS[variant];
  ctx.fillStyle = green;
  ctx.strokeStyle = shadeHex(green, 0.72);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y - 21, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.beginPath();
  ctx.ellipse(x - 5, y - 27, 5, 3.5, -0.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawSignpost(ctx: CanvasRenderingContext2D, x: number, y: number, emoji: string) {
  ctx.fillStyle = "rgba(70, 50, 60, 0.2)";
  ctx.beginPath();
  ctx.ellipse(x + 3, y + 2, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8b6b4a";
  ctx.fillRect(x - 1.5, y - 16, 3, 17);
  ctx.fillStyle = "#fff7ea";
  ctx.strokeStyle = "rgba(70, 48, 72, 0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y - 24, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.font = `13px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, x, y - 23.5);
  ctx.textBaseline = "alphabetic";
}

function drawSailboat(ctx: CanvasRenderingContext2D, x: number, y: number, eastward: boolean) {
  const dir = eastward ? 1 : -1;
  ctx.fillStyle = "rgba(30, 70, 100, 0.25)";
  ctx.beginPath();
  ctx.ellipse(x, y + 4, 22, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f5f0e7";
  ctx.strokeStyle = "#8f6a4c";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 20 * dir, y - 6);
  ctx.lineTo(x + 22 * dir, y - 6);
  ctx.lineTo(x + 14 * dir, y + 3);
  ctx.lineTo(x - 14 * dir, y + 3);
  ctx.closePath();
  ctx.fillStyle = "#a87356";
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#f5f0e7";
  ctx.beginPath();
  ctx.moveTo(x, y - 46);
  ctx.lineTo(x + 18 * dir, y - 10);
  ctx.lineTo(x, y - 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#f2a7c3";
  ctx.beginPath();
  ctx.moveTo(x - 2 * dir, y - 40);
  ctx.lineTo(x - 15 * dir, y - 12);
  ctx.lineTo(x - 2 * dir, y - 12);
  ctx.closePath();
  ctx.fill();
}

/** The cabin waits at the station (where the room's cable ends) before each trip. */
function drawCable(ctx: CanvasRenderingContext2D, cable: number[], time: number) {
  const LIFT = 60;
  ctx.strokeStyle = "rgba(55, 48, 70, 0.7)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cable[0], cable[1] - LIFT);
  for (let i = 2; i < cable.length; i += 2) ctx.lineTo(cable[i], cable[i + 1] - LIFT);
  ctx.stroke();

  const lengths: number[] = [];
  let total = 0;
  for (let i = 0; i < cable.length - 2; i += 2) {
    const l = Math.hypot(cable[i + 2] - cable[i], cable[i + 3] - cable[i + 1]);
    lengths.push(l);
    total += l;
  }
  if (!total) return;
  const cycle = time % 24;
  const ease = (t: number) => t * t * (3 - 2 * t);
  const along = cycle < 5 ? 1 : cycle < 12 ? 1 - ease((cycle - 5) / 7) : cycle < 17 ? 0 : ease((cycle - 17) / 7);
  let d = along * total;
  let seg = 0;
  while (seg < lengths.length - 1 && d > lengths[seg]) d -= lengths[seg++];
  const t = lengths[seg] ? d / lengths[seg] : 0;
  const cx = cable[seg * 2] + (cable[seg * 2 + 2] - cable[seg * 2]) * t;
  const cy = cable[seg * 2 + 1] + (cable[seg * 2 + 3] - cable[seg * 2 + 1]) * t - LIFT;
  const endX = cable[cable.length - 2];
  const endY = cable[cable.length - 1];
  ctx.fillStyle = "#6f5541";
  ctx.fillRect(endX - 3, endY - LIFT, 6, LIFT);
  ctx.fillStyle = "rgba(70, 50, 60, 0.18)";
  ctx.beginPath();
  ctx.ellipse(cx + 8, cy + LIFT + 22, 18, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3b3346";
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx, cy + 10);
  ctx.stroke();
  ctx.fillStyle = "#ef5b5b";
  ctx.strokeStyle = "#b83c46";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(cx - 18, cy + 10, 36, 24, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#cfe9fb";
  ctx.beginPath();
  ctx.roundRect(cx - 13, cy + 14, 26, 9, 4);
  ctx.fill();
}

function drawRainbowFlag(ctx: CanvasRenderingContext2D, x: number, y: number, tall: number, time: number) {
  const stripes = ["#e40303", "#ff8c00", "#ffed00", "#008026", "#004dff", "#750787"];
  ctx.fillStyle = "rgba(70, 50, 60, 0.22)";
  ctx.beginPath();
  ctx.ellipse(x + 4, y + 2, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d9d3de";
  ctx.strokeStyle = "#8f879c";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x - 3, y - tall, 6, tall + 2, 3);
  ctx.fill();
  ctx.stroke();
  const w = tall * 0.5;
  const h = tall * 0.3;
  const top = y - tall + 6;
  const cols = 12;
  const wave = (c: number) => Math.sin(time * 3 + c * 0.7) * (c / cols) * 7;
  stripes.forEach((color, s) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let c = 0; c <= cols; c++) ctx.lineTo(x + 3 + (w * c) / cols, top + (h * s) / 6 + wave(c));
    for (let c = cols; c >= 0; c--) ctx.lineTo(x + 3 + (w * c) / cols, top + (h * (s + 1)) / 6 + wave(c) + 0.6);
    ctx.closePath();
    ctx.fill();
  });
  ctx.fillStyle = "#f6d98b";
  ctx.beginPath();
  ctx.arc(x, y - tall - 2, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawNeonArch(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  const flicker = 0.75 + Math.sin(time * 9) * 0.08 + (Math.sin(time * 23) > 0.96 ? -0.4 : 0);
  ctx.fillStyle = "rgba(70, 50, 60, 0.2)";
  ctx.fillRect(x - 84, y - 2, 172, 8);
  ctx.fillStyle = "#4b4258";
  ctx.beginPath();
  ctx.roundRect(x - 88, y - 96, 9, 98, 4);
  ctx.roundRect(x + 79, y - 96, 9, 98, 4);
  ctx.fill();
  ctx.save();
  ctx.shadowColor = "#ff5fd2";
  ctx.shadowBlur = 18 * flicker;
  ctx.fillStyle = "#2b2140";
  ctx.strokeStyle = `rgba(255, 95, 210, ${flicker})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(x - 92, y - 128, 184, 40, 14);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = `rgba(255, 226, 250, ${flicker + 0.15})`;
  ctx.font = `800 17px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("新宿二丁目 · Ni-chōme", x, y - 102);
  ctx.restore();
}

function drawSummit(ctx: CanvasRenderingContext2D, x: number, y: number, label: string) {
  const blobs: [number, number, number, string][] = [
    [-30, -2, 24, "#b9ad9e"],
    [26, 0, 22, "#c4b8a8"],
    [0, -14, 30, "#cfc4b6"],
    [-8, -32, 17, "#ddd3c6"],
  ];
  ctx.fillStyle = "rgba(70, 50, 60, 0.2)";
  ctx.beginPath();
  ctx.ellipse(x + 6, y + 10, 56, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(90, 70, 60, 0.45)";
  ctx.lineWidth = 2;
  for (const [dx, dy, r, color] of blobs) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = "#6b4f3a";
  ctx.fillRect(x - 2, y - 96, 4, 56);
  ctx.fillStyle = "#009c3b";
  ctx.fillRect(x + 2, y - 96, 40, 26);
  ctx.fillStyle = "#ffdf00";
  ctx.beginPath();
  ctx.moveTo(x + 22, y - 93);
  ctx.lineTo(x + 39, y - 83);
  ctx.lineTo(x + 22, y - 73);
  ctx.lineTo(x + 5, y - 83);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#002776";
  ctx.beginPath();
  ctx.arc(x + 22, y - 83, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = `800 11px ${FONT}`;
  const w = ctx.measureText(label).width + 16;
  ctx.fillStyle = "rgba(255, 250, 240, 0.95)";
  ctx.strokeStyle = "rgba(70, 48, 72, 0.35)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y + 18, w, 19, 9.5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#3b2a45";
  ctx.textAlign = "center";
  ctx.fillText(label, x, y + 31);
}

/**
 * A miniature of the tower, smaller than its 125 m base so it reads on a phone;
 * it faces the camera whatever the real orientation. Walkable between the legs.
 */
const EIFFEL = { half: 140, height: 480 };

function eiffelTower(center: Point) {
  const { x: cx, y: cy } = center;
  const S = EIFFEL.half;
  const H = EIFFEL.height;
  const corners = {
    bl: { x: cx - S, y: cy - S },
    br: { x: cx + S, y: cy - S },
    fl: { x: cx - S, y: cy + S },
    fr: { x: cx + S, y: cy + S },
  };
  const at = (c: Point, t: number): Point => {
    const f = Math.pow(1 - t, 2.1);
    return { x: cx + (c.x - cx) * f, y: cy + (c.y - cy) * f - t * H };
  };
  const legs = Object.values(corners).map((c) => [
    c.x - 24,
    c.y - 24,
    c.x + 24,
    c.y - 24,
    c.x + 24,
    c.y + 24,
    c.x - 24,
    c.y + 24,
  ]);
  const bounds = { minX: cx - S - 44, maxX: cx + S + 44, minY: cy - H - 70, maxY: cy + S + 30 };

  const leg = (ctx: CanvasRenderingContext2D, corner: Point, fill: string, width: number) => {
    const N = 18;
    const left: Point[] = [];
    const right: Point[] = [];
    for (let k = 0; k <= N; k++) {
      const t = k / N;
      const p = at(corner, t);
      const a = at(corner, Math.max(0, t - 0.02));
      const b = at(corner, Math.min(1, t + 0.02));
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const nx = -(b.y - a.y) / len;
      const ny = (b.x - a.x) / len;
      const w = (width * (1 - t * 0.85)) / 2;
      left.push({ x: p.x + nx * w, y: p.y + ny * w });
      right.push({ x: p.x - nx * w, y: p.y - ny * w });
    }
    ctx.fillStyle = fill;
    ctx.strokeStyle = "#5e4532";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    [...left, ...right.reverse()].forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    right.reverse();
    ctx.strokeStyle = "rgba(70, 48, 32, 0.5)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let k = 0; k < N; k++) {
      ctx.moveTo(left[k].x, left[k].y);
      ctx.lineTo(right[k + 1].x, right[k + 1].y);
      ctx.moveTo(right[k].x, right[k].y);
      ctx.lineTo(left[k + 1].x, left[k + 1].y);
    }
    ctx.stroke();
  };

  const platform = (ctx: CanvasRenderingContext2D, t: number, thick: number) => {
    const pts = [at(corners.bl, t), at(corners.br, t), at(corners.fr, t), at(corners.fl, t)];
    ctx.fillStyle = "rgba(120, 90, 64, 0.18)";
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
    const [, , fr, fl] = pts;
    ctx.fillStyle = "#9b7653";
    ctx.strokeStyle = "#6f5139";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(fl.x - 8, fl.y - thick, fr.x - fl.x + 16, thick, Math.min(5, thick / 2));
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(255, 236, 200, 0.55)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(fl.x - 4, fl.y - thick + 2.5);
    ctx.lineTo(fr.x + 4, fr.y - thick + 2.5);
    ctx.stroke();
  };

  const arch = (ctx: CanvasRenderingContext2D, a: Point, b: Point, color: string, width: number) => {
    const p = at(a, 0.03);
    const q = at(b, 0.03);
    const top = at(a, 0.15).y;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.quadraticCurveTo((p.x + q.x) / 2, top - 26, q.x, q.y);
    ctx.stroke();
  };

  const paint = (ctx: CanvasRenderingContext2D) => {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.fillStyle = "rgba(76, 56, 74, 0.08)";
    ctx.beginPath();
    ctx.ellipse(cx + 24, cy + 14, S * 1.15, S * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    leg(ctx, corners.bl, "#7d5e43", 26);
    leg(ctx, corners.br, "#7d5e43", 26);
    arch(ctx, corners.bl, corners.br, "#7d5e43", 7);
    platform(ctx, 0.17, 16);
    platform(ctx, 0.36, 11);
    leg(ctx, corners.fl, "#a07a56", 32);
    leg(ctx, corners.fr, "#a07a56", 32);
    arch(ctx, corners.fl, corners.fr, "#a07a56", 11);
    ctx.strokeStyle = "rgba(255, 236, 200, 0.5)";
    ctx.lineWidth = 3;
    const p = at(corners.fl, 0.03);
    const q = at(corners.fr, 0.03);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.quadraticCurveTo(cx, at(corners.fl, 0.15).y - 26, q.x, q.y);
    ctx.stroke();
    const deck = at(corners.fl, 0.84);
    ctx.fillStyle = "#9b7653";
    ctx.strokeStyle = "#6f5139";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cx - 12, deck.y - 14, 24, 16, 4);
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, cy - H + 10);
    ctx.lineTo(cx, cy - H - 50);
    ctx.stroke();
  };

  const lights = (ctx: CanvasRenderingContext2D, time: number) => {
    const all = [corners.fl, corners.fr, corners.bl, corners.br];
    ctx.fillStyle = "rgba(255, 246, 200, 0.95)";
    for (let k = 0; k < 14; k++) {
      if (Math.sin(time * 6 + k * 2.1) <= 0.3) continue;
      const p = at(all[k % 4], (k * 0.618 + time * 0.07) % 0.95);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  return { legs, bounds, paint, lights };
}

/** MASP: a glass box hung from a red frame over the open "vão livre", which stays walkable. */
const MASP_BOTTOM = 46;
const MASP_TOP = 96;

function museum(box: Point[]) {
  const z1 = MASP_BOTTOM;
  const z2 = MASP_TOP;
  const lift = (p: Point, z: number): Point => ({ x: p.x, y: p.y - z });
  const edges = box.map((p, i) => [p, box[(i + 1) % 4]] as const);
  const len = (e: readonly [Point, Point]) => Math.hypot(e[1].x - e[0].x, e[1].y - e[0].y);
  const longIsFirst = len(edges[0]) >= len(edges[1]);
  const pillars = box.map((p) => [p.x - 9, p.y - 9, p.x + 9, p.y - 9, p.x + 9, p.y + 9, p.x - 9, p.y + 9]);
  const bounds = {
    minX: Math.min(...box.map((p) => p.x)) - 20,
    maxX: Math.max(...box.map((p) => p.x)) + 24,
    minY: Math.min(...box.map((p) => p.y)) - z2 - 20,
    maxY: Math.max(...box.map((p) => p.y)) + 20,
  };

  const paint = (ctx: CanvasRenderingContext2D) => {
    ctx.lineJoin = "round";
    ctx.fillStyle = "rgba(76, 56, 74, 0.16)";
    ctx.beginPath();
    box.forEach((p, i) => (i ? ctx.lineTo(p.x + 16, p.y + 10) : ctx.moveTo(p.x + 16, p.y + 10)));
    ctx.closePath();
    ctx.fill();

    const sorted = [...box].sort((a, b) => a.y - b.y);
    const drawPillar = (p: Point) => {
      ctx.fillStyle = "#d8342c";
      ctx.strokeStyle = "#9e211c";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(p.x - 7, p.y - z2 - 8, 14, z2 + 8, 5);
      ctx.fill();
      ctx.stroke();
    };
    sorted.slice(0, 2).forEach(drawPillar);

    for (const [a, b] of edges) {
      ctx.fillStyle = b.x - a.x > 0 ? "#4d6077" : "#3c4b5f";
      ctx.beginPath();
      const pts = [lift(a, z1), lift(b, z1), lift(b, z2), lift(a, z2)];
      pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = "#d9d6d2";
    ctx.strokeStyle = "rgba(70, 48, 72, 0.4)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    box.forEach((p, i) => {
      const q = lift(p, z2);
      if (i) ctx.lineTo(q.x, q.y);
      else ctx.moveTo(q.x, q.y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "#d8342c";
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    for (const idx of longIsFirst ? [0, 2] : [1, 3]) {
      const [a, b] = edges[idx];
      const pa = lift(a, z2 + 4);
      const pb = lift(b, z2 + 4);
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    }
    sorted.slice(2).forEach(drawPillar);
  };

  return { pillars, bounds, paint };
}
