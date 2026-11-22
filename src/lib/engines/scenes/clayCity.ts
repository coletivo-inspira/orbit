import { PARK_BOTS, type BotDefinition, type Point } from "@/lib/data/park";
import type { ParkRoomDefinition } from "@/lib/data/parkRooms";
import type { AreaKind, RoadKind, RoomMapData, RoomPoi } from "@/lib/world/osmRoom";
import type { ParkScene, SceneProp, SceneTap, ViewRect } from "./types";

/** World pixels per real-world meter: a 100 m radius room is 1600 px wide. */
export const PX_PER_M = 8;
const EDGE = 18;
const TREE_RADIUS = 9;
const PLAYER_RADIUS = 13;

interface Poly {
  rings: number[][];
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
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

const PALETTES: Record<string, Palette> = {
  "paris-torre-eiffel": {
    ground: "#e9dfc9",
    speckle: "#d6c9ae",
    roofs: ["#a9b7cf", "#9cacc8", "#b6c1d6"],
    walls: ["#f0dfbd", "#ead6b0"],
  },
  "rio-pao-de-acucar": { ground: "#86c470", speckle: "#6fae5c", roofs: ["#f4b393", "#f6d98b", "#f2a7c3"] },
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

/**
 * A "massinha" (modeling clay) miniature of a real place: streets, blocks,
 * parks, water and trees come from OpenStreetMap; the landmark is hand-drawn.
 */
export class ClayCityScene implements ParkScene {
  readonly world: { width: number; height: number };
  readonly spawn: Point;
  readonly bots: BotDefinition[];
  readonly background: string;
  readonly props: SceneProp[] = [];

  private readonly palette: Palette;
  private readonly blockers: Poly[] = [];
  private readonly treeCircles: Point[] = [];
  private readonly landmarkBlockers: Poly[] = [];
  private readonly buildings: Building[] = [];
  private readonly areas: (Poly & { kind: AreaKind })[] = [];
  private readonly roads: { kind: RoadKind; width: number; line: number[] }[] = [];
  private readonly cables: number[][];
  private readonly pois: (RoomPoi & { px: number; py: number })[];
  private readonly speckles: Point[] = [];
  private readonly landmark: Point & { rings: number[][] };
  private paths: {
    areas: Path2D[];
    roads: Map<RoadKind, Path2D>;
    walls: Map<Building, { lit: Path2D; shade: Path2D; top: Path2D; ground: Path2D }>;
  } | null = null;

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
    this.background = this.palette.ground;

    for (const a of data.areas) {
      const poly = { ...polyOf(ringsPx(a.rings)), kind: a.kind };
      this.areas.push(poly);
      if (a.kind === "water") this.blockers.push(poly);
    }
    for (const road of data.roads) this.roads.push({ ...road, line: road.line.map(px) });
    this.cables = data.cables.map((c) => c.map(px));

    data.buildings.forEach((b, i) => {
      const poly = polyOf(ringsPx(b.rings));
      const roof = this.palette.roofs[(hashString(`${room.id}:${i}`) >>> 3) % this.palette.roofs.length];
      const wallBase = this.palette.walls ? this.palette.walls[i % this.palette.walls.length] : null;
      const building: Building = {
        ...poly,
        elev: b.roof ? 14 : Math.max(14, Math.min(58, b.height * PX_PER_M * 0.32)),
        roof,
        wall: wallBase ? shadeHex(wallBase, 0.96) : shadeHex(roof, 0.8),
        shade: wallBase ? shadeHex(wallBase, 0.8) : shadeHex(roof, 0.66),
        isRoof: !!b.roof,
      };
      this.buildings.push(building);
      if (!b.roof) this.blockers.push(poly);
    });

    for (let i = 0; i < data.trees.length; i += 2)
      this.treeCircles.push({ x: px(data.trees[i]), y: px(data.trees[i + 1]) });
    this.scatterForestTrees(rand);

    this.landmark = { x: px(data.landmark.x), y: px(data.landmark.y), rings: ringsPx(data.landmark.rings) };
    this.addLandmark();

    for (let i = 0; i < 420; i++) this.speckles.push({ x: rand() * size, y: rand() * size });

    this.pois = data.pois.map((p) => ({ ...p, px: px(p.x), py: px(p.y) }));

    for (const b of this.buildings) {
      this.props.push({
        y: b.maxY,
        minX: b.minX - 8,
        maxX: b.maxX + 12,
        minY: b.minY - b.elev - 4,
        draw: (ctx) => this.drawBuilding(ctx, b),
      });
    }
    this.treeCircles.forEach((t, i) => {
      this.props.push({
        y: t.y,
        minX: t.x - 18,
        maxX: t.x + 18,
        minY: t.y - 36,
        draw: (ctx) => drawClayTree(ctx, t.x, t.y, i),
      });
    });
    for (const p of this.pois) {
      this.props.push({
        y: p.py,
        minX: p.px - 14,
        maxX: p.px + 14,
        minY: p.py - 40,
        draw: (ctx) => drawSignpost(ctx, p.px, p.py, POI_EMOJI[p.kind] ?? "📍"),
      });
    }

    this.spawn = this.findWalkable({ x: this.landmark.x, y: this.landmark.y + 90 }, 600) ?? {
      x: size / 2,
      y: size / 2,
    };
    this.bots = this.placeBots(rand);
  }

  collides(x: number, y: number, radius: number): boolean {
    const { width, height } = this.world;
    if (x < EDGE || x > width - EDGE || y < EDGE || y > height - EDGE) return true;
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
    return null;
  }

  // ------------------------------------------------------------ generation

  private scatterForestTrees(rand: () => number) {
    const spacing = 64;
    let added = 0;
    for (const a of this.areas) {
      if (a.kind !== "forest" && a.kind !== "park") continue;
      const step = a.kind === "forest" ? spacing : spacing * 2.2;
      for (let y = a.minY + step / 2; y < a.maxY; y += step) {
        for (let x = a.minX + step / 2; x < a.maxX; x += step) {
          if (added > 260) return;
          const tx = x + (rand() - 0.5) * step * 0.7;
          const ty = y + (rand() - 0.5) * step * 0.7;
          if (!pointInRings(tx, ty, a.rings)) continue;
          if (this.roads.some((r) => nearLine(tx, ty, r.line, (r.width * PX_PER_M) / 2 + 16))) continue;
          if (this.blockers.some((b) => circleHitsPoly(tx, ty, 16, b))) continue;
          if (this.treeCircles.some((t) => Math.hypot(t.x - tx, t.y - ty) < 30)) continue;
          this.treeCircles.push({ x: tx, y: ty });
          added++;
        }
      }
    }
  }

  private addLandmark() {
    const lm = this.landmark;
    const kind = this.room.landmark.kind;
    const ring = lm.rings[0];
    const box = ring ? orientedBox(ring) : null;

    if (kind === "eiffel" && box) {
      const prop = eiffelProp(box);
      for (const leg of prop.legs) this.landmarkBlockers.push(polyOf([leg]));
      this.props.push(prop.prop);
      return;
    }
    if (kind === "museum-frame" && box) {
      const prop = museumProp(box);
      for (const pillar of prop.pillars) this.landmarkBlockers.push(polyOf([pillar]));
      this.props.push(prop.prop);
      return;
    }
    const host = this.buildings.find((b) => !b.isRoof && pointInRings(lm.x, lm.y, b.rings));
    const sortY = host ? host.maxY + 1 : lm.y;
    const lift = host ? host.elev : 0;
    if (kind === "rainbow-flag") {
      const tall = host ? 150 : 230;
      this.props.push({
        y: sortY,
        minX: lm.x - 10,
        maxX: lm.x + 130,
        minY: lm.y - lift - tall - 10,
        draw: (ctx, time) => drawRainbowFlag(ctx, lm.x, lm.y - lift, tall, time),
      });
    } else if (kind === "neon-sign") {
      this.props.push({
        y: sortY,
        minX: lm.x - 110,
        maxX: lm.x + 110,
        minY: lm.y - lift - 130,
        draw: (ctx, time) => drawNeonArch(ctx, lm.x, lm.y - lift, time),
      });
    } else if (kind === "peak") {
      this.landmarkBlockers.push(
        polyOf([[lm.x - 30, lm.y - 14, lm.x + 30, lm.y - 14, lm.x + 30, lm.y + 10, lm.x - 30, lm.y + 10]]),
      );
      this.props.push({
        y: lm.y + 10,
        minX: lm.x - 70,
        maxX: lm.x + 70,
        minY: lm.y - 120,
        draw: (ctx) => drawSummit(ctx, lm.x, lm.y, this.room.landmark.label),
      });
    }
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

  private randomWalkable(rand: () => number, around: Point, dist: number): Point | null {
    for (let i = 0; i < 60; i++) {
      const a = rand() * Math.PI * 2;
      const d = dist * (0.35 + rand() * 0.65);
      const p = { x: around.x + Math.cos(a) * d, y: around.y + Math.sin(a) * d };
      if (!this.collides(p.x, p.y, 14)) return p;
    }
    return null;
  }

  private placeBots(rand: () => number): BotDefinition[] {
    const pool = [...PARK_BOTS].sort(() => rand() - 0.5).slice(0, this.room.botCount);
    const lines = this.room.botLines;
    return pool.map((b, i) => {
      const start = this.randomWalkable(rand, this.spawn, 420) ?? this.spawn;
      const waypoints = [start];
      for (let k = 0; k < 2; k++) waypoints.push(this.randomWalkable(rand, start, 220) ?? start);
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

  private ensurePaths() {
    if (this.paths) return this.paths;
    const roads = new Map<RoadKind, Path2D>();
    for (const r of this.roads) {
      const path = roads.get(r.kind) ?? new Path2D();
      path.moveTo(r.line[0], r.line[1]);
      for (let i = 2; i < r.line.length; i += 2) path.lineTo(r.line[i], r.line[i + 1]);
      roads.set(r.kind, path);
    }
    const walls = new Map<Building, { lit: Path2D; shade: Path2D; top: Path2D; ground: Path2D }>();
    for (const b of this.buildings) {
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
      walls.set(b, { lit, shade, top: ringsPath(b.rings, 0, -b.elev), ground: ringsPath(b.rings, 7, 5) });
    }
    this.paths = { areas: this.areas.map((a) => ringsPath(a.rings)), roads, walls };
    return this.paths;
  }

  drawGround(ctx: CanvasRenderingContext2D, view: ViewRect, time: number): void {
    const paths = this.ensurePaths();
    ctx.fillStyle = this.palette.ground;
    ctx.fillRect(0, 0, this.world.width, this.world.height);

    ctx.fillStyle = this.palette.speckle;
    for (const s of this.speckles) {
      if (s.x < view.x - 4 || s.x > view.x + view.w + 4 || s.y < view.y - 4 || s.y > view.y + view.h + 4) continue;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    this.areas.forEach((a, i) => {
      if (a.maxX < view.x || a.minX > view.x + view.w || a.maxY < view.y || a.minY > view.y + view.h) return;
      const [fill, edge] = AREA_COLORS[a.kind];
      ctx.fillStyle = fill;
      ctx.fill(paths.areas[i], "evenodd");
      ctx.strokeStyle = edge;
      ctx.lineWidth = 3;
      ctx.stroke(paths.areas[i]);
      if (a.kind === "water") {
        ctx.save();
        ctx.clip(paths.areas[i], "evenodd");
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
    });

    const order: RoadKind[] = ["path", "steps", "service", "pedestrian", "street", "major"];
    const widthOf = (kind: RoadKind) => (this.roads.find((r) => r.kind === kind)?.width ?? 3) * PX_PER_M;
    for (const kind of order) {
      const path = paths.roads.get(kind);
      if (!path) continue;
      const edge = ROAD_STYLE[kind][1];
      const w = widthOf(kind);
      ctx.strokeStyle = edge;
      ctx.lineWidth = w + 5;
      ctx.stroke(path);
    }
    for (const kind of order) {
      const path = paths.roads.get(kind);
      if (!path) continue;
      const [fill] = ROAD_STYLE[kind];
      const w = widthOf(kind);
      ctx.strokeStyle = fill;
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

    for (const b of this.buildings) {
      if (
        b.isRoof ||
        b.maxX + 10 < view.x ||
        b.minX > view.x + view.w ||
        b.maxY + 8 < view.y ||
        b.minY > view.y + view.h
      )
        continue;
      ctx.fillStyle = "rgba(76, 56, 74, 0.16)";
      ctx.fill(paths.walls.get(b)!.ground);
    }
  }

  private drawBuilding(ctx: CanvasRenderingContext2D, b: Building) {
    const p = this.ensurePaths().walls.get(b)!;
    ctx.lineJoin = "round";
    if (b.isRoof) {
      ctx.globalAlpha = 0.72;
      ctx.fillStyle = b.roof;
      ctx.fill(p.top, "evenodd");
      ctx.globalAlpha = 1;
      return;
    }
    ctx.fillStyle = b.wall;
    ctx.fill(p.lit);
    ctx.fillStyle = b.shade;
    ctx.fill(p.shade);
    ctx.strokeStyle = "rgba(70, 48, 72, 0.22)";
    ctx.lineWidth = 1.5;
    ctx.stroke(p.lit);
    ctx.stroke(p.shade);
    ctx.fillStyle = b.roof;
    ctx.fill(p.top, "evenodd");
    ctx.strokeStyle = "rgba(70, 48, 72, 0.4)";
    ctx.lineWidth = 2.5;
    ctx.stroke(p.top);
    ctx.save();
    ctx.translate(-1.5, -1.5);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
    ctx.lineWidth = 1.5;
    ctx.stroke(p.top);
    ctx.restore();
  }

  drawOverlay(ctx: CanvasRenderingContext2D, _view: ViewRect, time: number, player: Point): void {
    for (const cable of this.cables) drawCable(ctx, cable, time);
    ctx.font = "700 10px Inter, sans-serif";
    ctx.textAlign = "center";
    for (const p of this.pois) {
      if (Math.hypot(player.x - p.px, player.y - p.py) > 150) continue;
      const label = p.name.length > 26 ? `${p.name.slice(0, 25)}…` : p.name;
      const w = ctx.measureText(label).width + 14;
      ctx.fillStyle = "rgba(255, 250, 240, 0.94)";
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

function nearLine(x: number, y: number, line: number[], dist: number): boolean {
  for (let i = 0; i < line.length - 2; i += 2) {
    const ax = line[i];
    const ay = line[i + 1];
    const dx = line[i + 2] - ax;
    const dy = line[i + 3] - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2)) : 0;
    if (Math.hypot(x - (ax + dx * t), y - (ay + dy * t)) < dist) return true;
  }
  return false;
}

// ---------------------------------------------------------------- clay props

const TREE_GREENS = ["#5fb562", "#6cc070", "#57a85c", "#7cc46a"];

function drawClayTree(ctx: CanvasRenderingContext2D, x: number, y: number, i: number) {
  ctx.fillStyle = "rgba(70, 50, 60, 0.2)";
  ctx.beginPath();
  ctx.ellipse(x + 5, y + 3, 15, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#9a6b47";
  ctx.beginPath();
  ctx.roundRect(x - 3, y - 12, 6, 14, 3);
  ctx.fill();
  const green = TREE_GREENS[i % TREE_GREENS.length];
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
  ctx.font = "13px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, x, y - 23.5);
  ctx.textBaseline = "alphabetic";
}

function drawCable(ctx: CanvasRenderingContext2D, cable: number[], time: number) {
  ctx.strokeStyle = "rgba(55, 48, 70, 0.7)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cable[0], cable[1] - 60);
  for (let i = 2; i < cable.length; i += 2) ctx.lineTo(cable[i], cable[i + 1] - 60);
  ctx.stroke();

  const lengths: number[] = [];
  let total = 0;
  for (let i = 0; i < cable.length - 2; i += 2) {
    const l = Math.hypot(cable[i + 2] - cable[i], cable[i + 3] - cable[i + 1]);
    lengths.push(l);
    total += l;
  }
  if (!total) return;
  const phase = (time * 0.035) % 2;
  let d = (phase < 1 ? phase : 2 - phase) * total;
  let seg = 0;
  while (seg < lengths.length - 1 && d > lengths[seg]) d -= lengths[seg++];
  const t = lengths[seg] ? d / lengths[seg] : 0;
  const cx = cable[seg * 2] + (cable[seg * 2 + 2] - cable[seg * 2]) * t;
  const cy = cable[seg * 2 + 1] + (cable[seg * 2 + 3] - cable[seg * 2 + 1]) * t - 60;
  ctx.fillStyle = "rgba(70, 50, 60, 0.18)";
  ctx.beginPath();
  ctx.ellipse(cx + 8, cy + 82, 18, 7, 0, 0, Math.PI * 2);
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
  ctx.font = "800 17px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("新宿二丁目 · Ni-chōme", x, y - 102);
  ctx.restore();
}

function drawSummit(ctx: CanvasRenderingContext2D, x: number, y: number, label: string) {
  const blobs: [number, number, number, string][] = [
    [-26, -4, 22, "#b9ad9e"],
    [22, -2, 20, "#c4b8a8"],
    [0, -14, 28, "#cfc4b6"],
    [-6, -30, 16, "#ddd3c6"],
  ];
  ctx.fillStyle = "rgba(70, 50, 60, 0.2)";
  ctx.beginPath();
  ctx.ellipse(x + 6, y + 8, 50, 14, 0, 0, Math.PI * 2);
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
  ctx.fillRect(x - 2, y - 92, 4, 52);
  ctx.fillStyle = "#009c3b";
  ctx.fillRect(x + 2, y - 92, 40, 26);
  ctx.fillStyle = "#ffdf00";
  ctx.beginPath();
  ctx.moveTo(x + 22, y - 89);
  ctx.lineTo(x + 39, y - 79);
  ctx.lineTo(x + 22, y - 69);
  ctx.lineTo(x + 5, y - 79);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#002776";
  ctx.beginPath();
  ctx.arc(x + 22, y - 79, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = "800 11px Inter, sans-serif";
  const text = `${label} · 396 m`;
  const w = ctx.measureText(text).width + 16;
  ctx.fillStyle = "rgba(255, 250, 240, 0.95)";
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y + 16, w, 19, 9.5);
  ctx.fill();
  ctx.fillStyle = "#3b2a45";
  ctx.textAlign = "center";
  ctx.fillText(text, x, y + 29);
}

/** The Eiffel Tower as a clay lattice standing on its real footprint; the four legs block walking. */
function eiffelProp(box: Point[]): { prop: SceneProp; legs: number[][] } {
  const cx = box.reduce((s, p) => s + p.x, 0) / 4;
  const cy = box.reduce((s, p) => s + p.y, 0) / 4;
  const corners = [...box].sort((a, b) => a.y - b.y);
  const back = corners.slice(0, 2).sort((a, b) => a.x - b.x);
  const front = corners.slice(2).sort((a, b) => a.x - b.x);
  const H = 640;
  const legInset = 0.16;
  const legs = box.map((c) => {
    const lx = c.x + (cx - c.x) * legInset;
    const ly = c.y + (cy - c.y) * legInset;
    const s = 34;
    return [lx - s, ly - s, lx + s, ly - s, lx + s, ly + s, lx - s, ly + s];
  });
  const at = (corner: Point, t: number): Point => {
    const f = Math.pow(1 - t, 2.4) * (1 - legInset * 0.6);
    return { x: cx + (corner.x - cx) * f, y: cy + (corner.y - cy) * f - t * H };
  };
  const maxY = Math.max(...box.map((p) => p.y));
  const minX = Math.min(...box.map((p) => p.x));
  const maxX = Math.max(...box.map((p) => p.x));

  const legPath = (ctx: CanvasRenderingContext2D, corner: Point, color: string, width: number) => {
    for (let k = 0; k < 24; k++) {
      const a = at(corner, k / 24);
      const b = at(corner, (k + 1) / 24);
      ctx.strokeStyle = color;
      ctx.lineWidth = width * (1 - (k / 24) * 0.85);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  };
  const band = (ctx: CanvasRenderingContext2D, t: number, thick: number) => {
    const pts = [at(back[0], t), at(back[1], t), at(front[1], t), at(front[0], t)];
    ctx.fillStyle = "rgba(139, 104, 74, 0.55)";
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#9b7653";
    ctx.strokeStyle = "#6f5139";
    ctx.lineWidth = 2;
    const fl = pts[3];
    const fr = pts[2];
    ctx.beginPath();
    ctx.roundRect(Math.min(fl.x, fr.x) - 4, fl.y - thick, Math.abs(fr.x - fl.x) + 8, thick, thick / 2);
    ctx.fill();
    ctx.stroke();
  };

  const prop: SceneProp = {
    y: maxY,
    minX: minX - 40,
    maxX: maxX + 40,
    minY: cy - H - 60,
    draw: (ctx, time) => {
      ctx.lineCap = "round";
      ctx.fillStyle = "rgba(76, 56, 74, 0.14)";
      ctx.beginPath();
      ctx.ellipse(cx + 30, cy + 20, (maxX - minX) * 0.42, (maxY - cy) * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      legPath(ctx, back[0], "#7d5e43", 30);
      legPath(ctx, back[1], "#7d5e43", 30);
      band(ctx, 0.17, 18);
      band(ctx, 0.36, 12);
      legPath(ctx, front[0], "#a07a56", 34);
      legPath(ctx, front[1], "#a07a56", 34);
      const fl = at(front[0], 0.03);
      const fr = at(front[1], 0.03);
      const archTop = at(front[0], 0.15).y;
      ctx.strokeStyle = "#a07a56";
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(fl.x, fl.y);
      ctx.quadraticCurveTo(cx, archTop - 30, fr.x, fr.y);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255, 236, 200, 0.5)";
      ctx.lineWidth = 3;
      ctx.stroke();
      const tip = at(front[0], 1);
      ctx.strokeStyle = "#6f5139";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(cx, tip.y + 20);
      ctx.lineTo(cx, tip.y - 40);
      ctx.stroke();
      for (let k = 0; k < 14; k++) {
        const t = (k * 0.618 + time * 0.07) % 0.95;
        const side = k % 4;
        const corner = side === 0 ? front[0] : side === 1 ? front[1] : side === 2 ? back[0] : back[1];
        const p = at(corner, t);
        const on = Math.sin(time * 6 + k * 2.1) > 0.3;
        if (!on) continue;
        ctx.fillStyle = "rgba(255, 246, 200, 0.95)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  };
  return { prop, legs };
}

/** MASP: a glass box hung from a red frame over the open "vão livre", which stays walkable. */
function museumProp(box: Point[]): { prop: SceneProp; pillars: number[][] } {
  const z1 = 46;
  const z2 = 96;
  const lift = (p: Point, z: number): Point => ({ x: p.x, y: p.y - z });
  const edges = box.map((p, i) => [p, box[(i + 1) % 4]] as const);
  const len = (e: readonly [Point, Point]) => Math.hypot(e[1].x - e[0].x, e[1].y - e[0].y);
  const longIsFirst = len(edges[0]) >= len(edges[1]);
  const pillars = box.map((p) => [p.x - 9, p.y - 9, p.x + 9, p.y - 9, p.x + 9, p.y + 9, p.x - 9, p.y + 9]);
  const maxY = Math.max(...box.map((p) => p.y));

  const prop: SceneProp = {
    y: maxY,
    minX: Math.min(...box.map((p) => p.x)) - 20,
    maxX: Math.max(...box.map((p) => p.x)) + 20,
    minY: Math.min(...box.map((p) => p.y)) - z2 - 20,
    draw: (ctx) => {
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
    },
  };
  return { prop, pillars };
}
