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
  type BotDefinition,
  type Obstacle,
  type Point,
} from "@/lib/data/park";

export type Direction = "up" | "down" | "left" | "right";

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

interface BotState extends BotDefinition {
  walkPhase: number;
  wpIndex: number;
  lineIndex: number;
}

interface PlayerState {
  x: number;
  y: number;
  r: number;
  speed: number;
  targetX: number | null;
  targetY: number | null;
  walkPhase: number;
  speech: string | null;
  speechTimer: number;
}

export interface ActiveBotInfo {
  id: string;
  name: string;
  line: string;
}

export interface PlayerLook {
  firstName: string;
  skin: string;
  hair: string;
}

export interface Park2DCallbacks {
  onActiveBotChange: (bot: ActiveBotInfo | null) => void;
  onToast: (message: string, type?: "info" | "success") => void;
  onFoundPacoca: () => void;
  getFoundPacoca: () => boolean;
  getPlayerLook: () => PlayerLook;
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

/**
 * Pixel-art top-down room (WorkAdventure-style pilot). Rendering and movement
 * are local only; multiplayer presence (Supabase Realtime) is a later step.
 */
export class Park2DEngine {
  private readonly ctx: CanvasRenderingContext2D;
  private viewW = 390;
  private viewH = 560;
  private camX = 0;
  private camY = 0;
  private time = 0;
  private lastFrame = performance.now();
  private rafId: number | null = null;
  private pointerWalking = false;
  private pacocaSpeechTimer = 0;
  private activeBotId: string | null = null;
  private readonly keys: Record<Direction, boolean> = { up: false, down: false, left: false, right: false };
  private readonly dpad: Record<Direction, boolean> = { up: false, down: false, left: false, right: false };
  private readonly flowers = buildFlowers();
  private readonly resizeObserver: ResizeObserver;
  private readonly player: PlayerState = {
    ...PLAYER_SPAWN,
    r: 13,
    speed: 175,
    targetX: null,
    targetY: null,
    walkPhase: 0,
    speech: null,
    speechTimer: 0,
  };
  private readonly bots: BotState[] = PARK_BOTS.map((b) => ({
    ...b,
    waypoints: b.waypoints.map((w) => ({ ...w })),
    walkPhase: 0,
    wpIndex: 0,
    lineIndex: 0,
  }));

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly wrap: HTMLElement,
    private readonly cb: Park2DCallbacks,
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    this.ctx = ctx;
    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(wrap);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    canvas.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("pointercancel", this.onPointerUp);
    this.rafId = requestAnimationFrame(this.loop);
  }

  destroy(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.resizeObserver.disconnect();
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("pointercancel", this.onPointerUp);
  }

  say(message: string): void {
    const msg = message.trim();
    if (!msg) return;
    this.player.speech = msg;
    this.player.speechTimer = 5.5;
  }

  setDpad(dir: Direction, pressed: boolean): void {
    this.dpad[dir] = pressed;
    if (pressed) this.clearTarget();
  }

  cycleBotDialogue(botId: string): void {
    const bot = this.bots.find((b) => b.id === botId);
    if (!bot) return;
    bot.lineIndex++;
    this.emitActiveBot(bot);
  }

  private clearTarget() {
    this.player.targetX = null;
    this.player.targetY = null;
  }

  private setTarget(x: number, y: number) {
    this.player.targetX = x;
    this.player.targetY = y;
  }

  private resize() {
    const w = Math.max(240, this.wrap.clientWidth || 390);
    const h = Math.max(240, this.wrap.clientHeight || 540);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.viewW = w;
    this.viewH = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private screenToWorld(clientX: number, clientY: number): Point {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return { x: this.player.x, y: this.player.y };
    const sx = (clientX - rect.left) * (this.viewW / rect.width);
    const sy = (clientY - rect.top) * (this.viewH / rect.height);
    return {
      x: Math.max(24, Math.min(WORLD.width - 24, sx + this.camX)),
      y: Math.max(24, Math.min(WORLD.height - 24, sy + this.camY)),
    };
  }

  private ensureUnstuck() {
    const p = this.player;
    if (!collidesAt(p.x, p.y, p.r)) return;
    for (let dist = 8; dist <= 96; dist += 8) {
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
        const nx = p.x + Math.cos(a) * dist;
        const ny = p.y + Math.sin(a) * dist;
        if (!collidesAt(nx, ny, p.r)) {
          p.x = nx;
          p.y = ny;
          return;
        }
      }
    }
  }

  private keyDirection(key: string): Direction | null {
    switch (key.toLowerCase()) {
      case "w":
      case "arrowup":
        return "up";
      case "s":
      case "arrowdown":
        return "down";
      case "a":
      case "arrowleft":
        return "left";
      case "d":
      case "arrowright":
        return "right";
      default:
        return null;
    }
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    const tag = target?.tagName?.toLowerCase() ?? "";
    if (tag === "input" || tag === "textarea" || target?.isContentEditable) return;
    const dir = this.keyDirection(e.key);
    if (!dir) return;
    e.preventDefault();
    this.keys[dir] = true;
    this.clearTarget();
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const dir = this.keyDirection(e.key);
    if (dir) this.keys[dir] = false;
  };

  private onBlur = () => {
    (Object.keys(this.keys) as Direction[]).forEach((d) => {
      this.keys[d] = false;
      this.dpad[d] = false;
    });
    this.pointerWalking = false;
  };

  private onPointerDown = (e: PointerEvent) => {
    e.preventDefault();
    const pt = this.screenToWorld(e.clientX, e.clientY);

    if (Math.hypot(pt.x - PACOCA_POSITION.x, pt.y - PACOCA_POSITION.y) < 34) this.triggerPacoca();

    if (inRect(pt, CAFE_AREA)) {
      this.cb.onToast("☕ Café Orbit: você pediu um iced latte virtual!", "success");
      this.setTarget(245, 258);
      return;
    }
    if (inRect(pt, TOTEM_AREA)) {
      this.cb.onToast("🛡️ Totem Saúde: acesse a aba Comunidade para guias de PrEP e vacinas!", "info");
      this.setTarget(930, 252);
      return;
    }
    for (const b of this.bots) {
      if (Math.hypot(pt.x - b.x, pt.y - b.y) < 34) {
        const below = b.y + 42;
        this.setTarget(b.x, collidesAt(b.x, below, this.player.r) ? b.y - 42 : below);
        if (this.activeBotId === b.id) b.lineIndex++;
        this.focusBot(b);
        return;
      }
    }
    this.pointerWalking = true;
    this.setTarget(pt.x, pt.y);
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.pointerWalking) return;
    const pt = this.screenToWorld(e.clientX, e.clientY);
    this.setTarget(pt.x, pt.y);
  };

  private onPointerUp = () => {
    this.pointerWalking = false;
  };

  private triggerPacoca() {
    this.pacocaSpeechTimer = 4.5;
    if (this.cb.getFoundPacoca()) return;
    this.cb.onFoundPacoca();
    this.cb.onToast("🐱 Você encontrou o Paçoca perto do Café Orbit! Avise o Matheus!", "success");
    const active = this.bots.find((b) => b.id === this.activeBotId);
    if (active) this.emitActiveBot(active);
  }

  private botLine(bot: BotState): string {
    const pool = bot.foundLines && this.cb.getFoundPacoca() ? bot.foundLines : bot.lines;
    return pool[bot.lineIndex % pool.length];
  }

  private focusBot(bot: BotState) {
    this.activeBotId = bot.id;
    this.emitActiveBot(bot);
  }

  private emitActiveBot(bot: BotState) {
    this.cb.onActiveBotChange({ id: bot.id, name: bot.name, line: this.botLine(bot) });
  }

  private update(dt: number) {
    const p = this.player;
    this.time += dt;
    this.ensureUnstuck();

    if (p.speechTimer > 0) {
      p.speechTimer = Math.max(0, p.speechTimer - dt);
      if (p.speechTimer === 0) p.speech = null;
    }
    if (this.pacocaSpeechTimer > 0) this.pacocaSpeechTimer = Math.max(0, this.pacocaSpeechTimer - dt);

    let vx = 0;
    let vy = 0;
    if (this.keys.left || this.dpad.left) vx -= 1;
    if (this.keys.right || this.dpad.right) vx += 1;
    if (this.keys.up || this.dpad.up) vy -= 1;
    if (this.keys.down || this.dpad.down) vy += 1;

    let moving = false;
    if (vx !== 0 || vy !== 0) {
      const len = Math.hypot(vx, vy);
      vx = (vx / len) * p.speed * dt;
      vy = (vy / len) * p.speed * dt;
      moving = true;
    } else if (p.targetX !== null && p.targetY !== null) {
      const dx = p.targetX - p.x;
      const dy = p.targetY - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 5) {
        const step = Math.min(dist, p.speed * dt);
        vx = (dx / dist) * step;
        vy = (dy / dist) * step;
        moving = true;
      } else {
        this.clearTarget();
      }
    }

    if (moving) {
      const prevX = p.x;
      const prevY = p.y;
      // Axis-separated collision lets the avatar slide along obstacles.
      if (!collidesAt(p.x + vx, p.y, p.r)) p.x += vx;
      if (!collidesAt(p.x, p.y + vy, p.r)) p.y += vy;
      if (p.targetX !== null && Math.hypot(p.x - prevX, p.y - prevY) < 0.25 && !this.pointerWalking) {
        this.clearTarget();
      }
      p.walkPhase += dt * 11;
    } else {
      p.walkPhase = 0;
    }

    if (Math.hypot(p.x - PACOCA_POSITION.x, p.y - PACOCA_POSITION.y) < 62) this.triggerPacoca();

    let nearest: BotState | null = null;
    let nearestDist = 92;
    this.bots.forEach((b, i) => {
      const distToPlayer = Math.hypot(b.x - p.x, b.y - p.y);
      if (distToPlayer < nearestDist) {
        nearestDist = distToPlayer;
        nearest = b;
      }
      if (distToPlayer < 88 || b.pauseTimer > 0) {
        if (distToPlayer >= 88) b.pauseTimer -= dt;
        b.walkPhase = 0;
        return;
      }
      const wp = b.waypoints[b.wpIndex];
      const dx = wp.x - b.x;
      const dy = wp.y - b.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 6) {
        b.wpIndex = (b.wpIndex + 1) % b.waypoints.length;
        b.pauseTimer = 1.6 + (i % 3) * 0.7;
        b.walkPhase = 0;
        return;
      }
      const step = Math.min(dist, b.speed * dt);
      const nx = b.x + (dx / dist) * step;
      const ny = b.y + (dy / dist) * step;
      if (!collidesAt(nx, ny, 12)) {
        b.x = nx;
        b.y = ny;
        b.walkPhase += dt * 7.5;
      } else {
        b.wpIndex = (b.wpIndex + 1) % b.waypoints.length;
        b.pauseTimer = 1.0;
      }
    });

    const near = nearest as BotState | null;
    if (near) {
      if (this.activeBotId !== near.id) this.focusBot(near);
    } else if (this.activeBotId !== null) {
      this.activeBotId = null;
      this.cb.onActiveBotChange(null);
    }

    const desiredCamX = Math.max(0, Math.min(WORLD.width - this.viewW, p.x - this.viewW / 2));
    const desiredCamY = Math.max(0, Math.min(WORLD.height - this.viewH, p.y - this.viewH / 2));
    this.camX += (desiredCamX - this.camX) * Math.min(1, dt * 8);
    this.camY += (desiredCamY - this.camY) * Math.min(1, dt * 8);
  }

  private loop = (now: number) => {
    const dt = Math.min(0.05, Math.max(0.001, (now - this.lastFrame) / 1000));
    this.lastFrame = now;
    this.update(dt);
    this.draw();
    this.rafId = requestAnimationFrame(this.loop);
  };

  // ---------------------------------------------------------------- drawing

  private draw() {
    const ctx = this.ctx;
    ctx.save();
    ctx.clearRect(0, 0, this.viewW, this.viewH);
    ctx.translate(-Math.round(this.camX), -Math.round(this.camY));

    this.drawGround(ctx);
    this.drawTargetMarker(ctx);
    this.drawFountain(ctx);
    this.drawCafeKiosk(ctx);
    this.drawHealthTotem(ctx);
    this.drawBenches(ctx);
    this.drawLamps(ctx);

    ctx.fillStyle = "#15803d";
    ctx.beginPath();
    ctx.arc(352, 206, 18, 0, Math.PI * 2);
    ctx.arc(374, 202, 16, 0, Math.PI * 2);
    ctx.fill();
    this.drawPacoca(ctx);

    type Drawable = { y: number; draw: () => void };
    const drawables: Drawable[] = [
      ...TREES.map((t) => ({ y: t.y, draw: () => this.drawTree(ctx, t.x, t.y) })),
      ...this.bots.map((b) => ({ y: b.y, draw: () => this.drawCharacter(ctx, b, false) })),
      { y: this.player.y, draw: () => this.drawCharacter(ctx, this.player, true) },
    ];
    drawables.sort((a, b) => a.y - b.y).forEach((d) => d.draw());

    if (this.pacocaSpeechTimer > 0) {
      this.drawSpeechBubble(ctx, PACOCA_POSITION.x, PACOCA_POSITION.y - 24, "Miau! 🐱 (Paçoca)");
    }
    const active = this.bots.find((b) => b.id === this.activeBotId);
    if (active) this.drawSpeechBubble(ctx, active.x, active.y - 46, this.botLine(active));
    if (this.player.speech) {
      this.drawSpeechBubble(ctx, this.player.x, this.player.y - 46, this.player.speech, true);
    }
    ctx.restore();
  }

  private drawGround(ctx: CanvasRenderingContext2D) {
    const tile = 32;
    const startCol = Math.max(0, Math.floor(this.camX / tile));
    const endCol = Math.min(Math.ceil(WORLD.width / tile), Math.ceil((this.camX + this.viewW) / tile));
    const startRow = Math.max(0, Math.floor(this.camY / tile));
    const endRow = Math.min(Math.ceil(WORLD.height / tile), Math.ceil((this.camY + this.viewH) / tile));
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

  private drawTargetMarker(ctx: CanvasRenderingContext2D) {
    const { targetX, targetY } = this.player;
    if (targetX === null || targetY === null) return;
    const pulse = 8 + Math.sin(this.time * 8) * 3;
    ctx.strokeStyle = "rgba(196, 181, 253, 0.9)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(targetX, targetY, pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(167, 139, 250, 0.35)";
    ctx.beginPath();
    ctx.arc(targetX, targetY, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawFountain(ctx: CanvasRenderingContext2D) {
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
    const ripple = 14 + ((this.time * 16) % 24);
    ctx.strokeStyle = `rgba(224, 242, 254, ${Math.max(0, 0.85 - (ripple - 14) / 28)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(600, 450, ripple, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(590, 440, 20, 20);
    ctx.fillStyle = "#bae6fd";
    ctx.fillRect(596, 444 + Math.sin(this.time * 10) * 2, 8, 8);
  }

  private drawCafeKiosk(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "rgba(0,0,0,0.24)";
    ctx.fillRect(156, 134, 185, 102);
    ctx.fillStyle = "#fef3c7";
    ctx.fillRect(150, 155, 185, 75);
    ctx.fillStyle = "#78350f";
    ctx.fillRect(166, 204, 153, 20);
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 === 0 ? "#7c3aed" : "#e9d5ff";
      ctx.fillRect(146 + i * 24, 125, 24, 34);
    }
    ctx.fillStyle = "#1e1b4b";
    ctx.fillRect(184, 165, 118, 24);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("☕ CAFÉ ORBIT", 243, 181);
  }

  private drawHealthTotem(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(876, 162, 126, 70);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(870, 155, 126, 72);
    ctx.strokeStyle = "#34d399";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(872, 157, 122, 68);
    ctx.fillStyle = "#34d399";
    ctx.font = "bold 10px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🛡️ SAÚDE & PREP", 933, 183);
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "600 9px Inter, sans-serif";
    ctx.fillText("Guia Público SUS", 933, 202);
  }

  private drawBenches(ctx: CanvasRenderingContext2D) {
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

  private drawLamps(ctx: CanvasRenderingContext2D) {
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

  private drawPacoca(ctx: CanvasRenderingContext2D) {
    const { x, y } = PACOCA_POSITION;
    const bob = Math.sin(this.time * 4) * 1.2;
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

  private drawTree(ctx: CanvasRenderingContext2D, x: number, y: number) {
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

  private drawCharacter(ctx: CanvasRenderingContext2D, ch: BotState | PlayerState, isPlayer: boolean) {
    const x = Math.round(ch.x);
    const y = Math.round(ch.y);
    const step = Math.sin(ch.walkPhase || 0) * 3.5;
    const look = isPlayer ? this.cb.getPlayerLook() : null;
    const bot = isPlayer ? null : (ch as BotState);

    if (isPlayer || bot?.id === this.activeBotId) {
      ctx.strokeStyle = isPlayer ? "#c4b5fd" : "#6ee7b7";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y + 6, 16, 7, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(0,0,0,0.32)";
    ctx.beginPath();
    ctx.ellipse(x, y + 6, 11, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#1e293b";
    ctx.fillRect(x - 6, y - 3 + (step > 0 ? -step * 0.5 : 0), 5, 9);
    ctx.fillRect(x + 1, y - 3 + (step < 0 ? step * 0.5 : 0), 5, 9);

    ctx.fillStyle = look ? "#a855f7" : bot!.shirt;
    ctx.fillRect(x - 8, y - 18, 16, 16);
    ctx.fillStyle = look ? look.skin : bot!.skin;
    ctx.fillRect(x - 7, y - 32, 14, 14);
    ctx.fillStyle = look ? look.hair : bot!.hair;
    ctx.fillRect(x - 8, y - 35, 16, 6);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(x - 4, y - 26, 2, 2);
    ctx.fillRect(x + 2, y - 26, 2, 2);

    const label = look ? `${look.firstName} (Você)` : bot!.name;
    ctx.font = "bold 10px Inter, sans-serif";
    const bw = ctx.measureText(label).width + 14;
    const by = y + 11;
    ctx.fillStyle = isPlayer ? "rgba(124, 58, 237, 0.92)" : "rgba(15, 23, 42, 0.85)";
    ctx.beginPath();
    ctx.roundRect(x - bw / 2, by, bw, 17, 8);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(label, x, by + 12);
  }

  private drawSpeechBubble(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, isPlayer = false) {
    const display = text.length > 44 ? `${text.slice(0, 42)}…` : text;
    ctx.font = "600 10.5px Inter, sans-serif";
    const bw = Math.max(64, ctx.measureText(display).width + 18);
    const bh = 24;
    const bx = Math.round(x - bw / 2);
    const by = Math.round(y - bh);
    ctx.fillStyle = isPlayer ? "rgba(109, 40, 217, 0.94)" : "rgba(15, 23, 42, 0.92)";
    ctx.strokeStyle = isPlayer ? "rgba(221, 214, 254, 0.7)" : "rgba(255, 255, 255, 0.28)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 11);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 5, by + bh);
    ctx.lineTo(x + 5, by + bh);
    ctx.lineTo(x, by + bh + 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(display, x, by + 15.5);
  }
}
