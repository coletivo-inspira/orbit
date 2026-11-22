import {
  CAFE_AREA,
  LAMPS,
  OBSTACLES,
  PACOCA_POSITION,
  PARK_BOTS,
  PLAYER_SPAWN,
  TOTEM_AREA,
  TREES,
  WORLD,
  type Obstacle,
  type Point,
} from "@/lib/data/park";
import type { ParkScene, SceneProp, SceneTap, ViewRect } from "./types";

const EDGE = 22;

export function collidesAt(x: number, y: number, radius: number, obstacles: Obstacle[] = OBSTACLES): boolean {
  if (x < EDGE || x > WORLD.width - EDGE || y < EDGE || y > WORLD.height - EDGE) return true;
  for (const ob of obstacles) {
    if (ob.type === "circle") {
      if (Math.hypot(x - ob.x, y - ob.y) < ob.r + radius) return true;
    } else {
      const cx = Math.max(ob.x, Math.min(x, ob.x + ob.w));
      const cy = Math.max(ob.y, Math.min(y, ob.y + ob.h));
      if (Math.hypot(x - cx, y - cy) < radius) return true;
    }
  }
  return false;
}

function inRect(p: Point, r: { x: number; y: number; w: number; h: number }) {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

interface Flower extends Point {
  color: string;
}

function buildFlowers(): Flower[] {
  const colors = ["#fef08a", "#f9a8d4", "#93c5fd", "#ffffff", "#c4b5fd"];
  const flowers: Flower[] = [];
  for (let i = 0; i < 64; i++) {
    const x = 60 + ((i * 173) % 1080);
    const y = 60 + ((i * 251) % 780);
    if ((x > 525 && x < 675) || (y > 375 && y < 525)) continue;
    if (Math.hypot(x - 600, y - 450) < 170) continue;
    flowers.push({ x, y, color: colors[i % colors.length] });
  }
  return flowers;
}

/** The hand-drawn pixel-art pilot room (fountain, Café Orbit, health totem, Paçoca). */
export class CentralParkScene implements ParkScene {
  readonly world = WORLD;
  readonly spawn = PLAYER_SPAWN;
  readonly bots = PARK_BOTS;
  readonly background = "#1b2e1e";
  readonly pacoca = PACOCA_POSITION;
  readonly props: SceneProp[] = TREES.map((t) => ({
    y: t.y,
    minX: t.x - 22,
    maxX: t.x + 22,
    minY: t.y - 40,
    draw: (ctx) => drawTree(ctx, t.x, t.y),
  }));
  private readonly flowers = buildFlowers();

  collides(x: number, y: number, radius: number): boolean {
    return collidesAt(x, y, radius);
  }

  tap(pt: Point): SceneTap | null {
    if (inRect(pt, CAFE_AREA)) {
      return {
        toast: { message: "☕ Café Orbit: você pediu um iced latte virtual!", type: "success" },
        walkTo: { x: 245, y: 258 },
      };
    }
    if (inRect(pt, TOTEM_AREA)) {
      return {
        toast: { message: "🛡️ Totem Saúde: acesse a aba Comunidade para guias de PrEP e vacinas!", type: "info" },
        walkTo: { x: 930, y: 252 },
      };
    }
    return null;
  }

  drawGround(ctx: CanvasRenderingContext2D, view: ViewRect, time: number): void {
    this.drawTiles(ctx, view);
    this.drawFountain(ctx, time);
    drawCafeKiosk(ctx);
    drawHealthTotem(ctx);
    drawBenches(ctx);
    drawLamps(ctx);
    ctx.fillStyle = "#15803d";
    ctx.beginPath();
    ctx.arc(352, 206, 18, 0, Math.PI * 2);
    ctx.arc(374, 202, 16, 0, Math.PI * 2);
    ctx.fill();
    drawPacoca(ctx, time);
  }

  private drawTiles(ctx: CanvasRenderingContext2D, view: ViewRect) {
    const tile = 32;
    const startCol = Math.max(0, Math.floor(view.x / tile));
    const endCol = Math.min(Math.ceil(WORLD.width / tile), Math.ceil((view.x + view.w) / tile));
    const startRow = Math.max(0, Math.floor(view.y / tile));
    const endRow = Math.min(Math.ceil(WORLD.height / tile), Math.ceil((view.y + view.h) / tile));
    for (let r = startRow; r < endRow; r++) {
      for (let c = startCol; c < endCol; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? "#2f7a47" : "#2a6f40";
        ctx.fillRect(c * tile, r * tile, tile, tile);
      }
    }

    ctx.fillStyle = "#c8b896";
    ctx.fillRect(552, 0, 96, WORLD.height);
    ctx.fillRect(0, 404, WORLD.width, 92);
    ctx.fillRect(190, 232, 820, 56);
    ctx.beginPath();
    ctx.arc(600, 450, 152, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#b6a47e";
    for (let i = 0; i < 42; i++) {
      ctx.fillRect(560 + ((i * 37) % 80), 30 + ((i * 89) % 840), 5, 4);
    }

    for (const f of this.flowers) {
      ctx.fillStyle = "#14532d";
      ctx.fillRect(f.x - 1, f.y + 2, 4, 3);
      ctx.fillStyle = f.color;
      ctx.fillRect(f.x - 2, f.y - 2, 5, 5);
    }
  }

  private drawFountain(ctx: CanvasRenderingContext2D, time: number) {
    const rings: [number, number, string][] = [
      [456, 62, "rgba(15, 23, 42, 0.25)"],
      [450, 58, "#64748b"],
      [450, 50, "#94a3b8"],
      [450, 42, "#0ea5e9"],
    ];
    for (const [y, r, color] of rings) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(600, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    const ripple = 14 + ((time * 16) % 24);
    ctx.strokeStyle = `rgba(224, 242, 254, ${Math.max(0, 0.85 - (ripple - 14) / 28)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(600, 450, ripple, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(590, 440, 20, 20);
    ctx.fillStyle = "#bae6fd";
    ctx.fillRect(596, 444 + Math.sin(time * 10) * 2, 8, 8);
  }
}

function drawCafeKiosk(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.24)";
  ctx.fillRect(156, 134, 185, 102);
  ctx.fillStyle = "#fef3c7";
  ctx.fillRect(150, 155, 185, 75);
  ctx.fillStyle = "#78350f";
  ctx.fillRect(166, 204, 153, 20);
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#a87356" : "#f5f0e7";
    ctx.fillRect(146 + i * 24, 125, 24, 34);
  }
  ctx.fillStyle = "#1c2631";
  ctx.fillRect(184, 165, 118, 24);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("☕ CAFÉ ORBIT", 243, 181);
}

function drawHealthTotem(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(876, 162, 126, 70);
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(870, 155, 126, 72);
  ctx.strokeStyle = "#34d399";
  ctx.lineWidth = 2.5;
  ctx.strokeRect(872, 157, 122, 68);
  ctx.fillStyle = "#34d399";
  ctx.font = "bold 10px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("🛡️ SAÚDE & PREP", 933, 183);
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "600 9px system-ui, sans-serif";
  ctx.fillText("Guia Público SUS", 933, 202);
}

function drawBenches(ctx: CanvasRenderingContext2D) {
  for (const b of OBSTACLES) {
    if (b.kind !== "bench" || b.type !== "rect") continue;
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(b.x + 2, b.y + 4, b.w, b.h);
    ctx.fillStyle = "#92400e";
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = "#b45309";
    ctx.fillRect(b.x + 2, b.y + 2, b.w - 4, 6);
    ctx.fillRect(b.x + 2, b.y + 11, b.w - 4, 6);
  }
}

function drawLamps(ctx: CanvasRenderingContext2D) {
  for (const l of LAMPS) {
    const g = ctx.createRadialGradient(l.x, l.y - 16, 2, l.x, l.y - 16, 36);
    g.addColorStop(0, "rgba(254, 240, 138, 0.36)");
    g.addColorStop(1, "rgba(254, 240, 138, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(l.x, l.y - 16, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#334155";
    ctx.fillRect(l.x - 2, l.y - 18, 4, 22);
    ctx.fillStyle = "#fef08a";
    ctx.fillRect(l.x - 4, l.y - 23, 8, 7);
  }
}

function drawPacoca(ctx: CanvasRenderingContext2D, time: number) {
  const { x, y } = PACOCA_POSITION;
  const bob = Math.sin(time * 4) * 1.2;
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(x, y + 6, 9, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f97316";
  ctx.fillRect(x - 7, y - 4 + bob, 14, 9);
  ctx.fillRect(x - 5, y - 11 + bob, 10, 8);
  ctx.fillRect(x - 5, y - 14 + bob, 3, 3);
  ctx.fillRect(x + 2, y - 14 + bob, 3, 3);
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(x - 3, y - 8 + bob, 2, 2);
  ctx.fillRect(x + 1, y - 8 + bob, 2, 2);
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "rgba(0,0,0,0.24)";
  ctx.beginPath();
  ctx.ellipse(x, y + 18, 22, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#713f12";
  ctx.fillRect(x - 6, y - 2, 12, 22);
  ctx.fillStyle = "#14532d";
  ctx.fillRect(x - 22, y - 28, 44, 28);
  ctx.fillStyle = "#166534";
  ctx.fillRect(x - 18, y - 36, 36, 26);
  ctx.fillStyle = "#22c55e";
  ctx.fillRect(x - 12, y - 40, 24, 16);
}
