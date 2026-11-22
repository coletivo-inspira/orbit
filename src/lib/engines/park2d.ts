import type { BotDefinition, Point } from "@/lib/data/park";
import type { ParkScene, SceneProp, ViewRect } from "./scenes/types";

export type Direction = "up" | "down" | "left" | "right";

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

export type Proximity = "perto" | "caminho" | "longe";

export interface RosterEntry {
  id: string;
  name: string;
  proximity: Proximity;
}

const TALK_RANGE = 92;
/** Opacity of a prop that stands between the camera and the player. */
const SEE_THROUGH = 0.35;

export function proximityOf(distance: number): Proximity {
  if (distance < TALK_RANGE) return "perto";
  return distance < 320 ? "caminho" : "longe";
}

export interface PlayerLook {
  firstName: string;
  skin: string;
  hair: string;
}

export interface Park2DCallbacks {
  onActiveBotChange: (bot: ActiveBotInfo | null) => void;
  /** Emitted only when someone's proximity bucket or the order changes. */
  onRosterChange: (roster: RosterEntry[]) => void;
  reducedMotion: () => boolean;
  onToast: (message: string, type?: "info" | "success") => void;
  onFoundPacoca: () => void;
  getFoundPacoca: () => boolean;
  getPlayerLook: () => PlayerLook;
}

/**
 * Top-down Parque room (WorkAdventure-style): movement, bots, chat bubbles and
 * camera; the scene supplies the map. Local only; multiplayer presence
 * (Supabase Realtime) is a later step.
 */
export class Park2DEngine {
  private readonly ctx: CanvasRenderingContext2D;
  private viewW = 390;
  private viewH = 560;
  private camX = 0;
  private camY = 0;
  private time = 0;
  private decorTime = 0;
  private frameDt = 0;
  private lastFrame = performance.now();
  private rafId: number | null = null;
  private pointerWalking = false;
  private pacocaSpeechTimer = 0;
  private activeBotId: string | null = null;
  /** Bot chosen from the list: stays active while the player walks to it. */
  private engagedBotId: string | null = null;
  /** Bot whose card was closed; it won't reopen until the player steps away. */
  private dismissedBotId: string | null = null;
  private rosterKey = "";
  private readonly keys: Record<Direction, boolean> = { up: false, down: false, left: false, right: false };
  private readonly dpad: Record<Direction, boolean> = { up: false, down: false, left: false, right: false };
  private readonly fades = new Map<SceneProp, number>();
  private readonly resizeObserver: ResizeObserver;
  private readonly player: PlayerState;
  private readonly bots: BotState[];

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly wrap: HTMLElement,
    private readonly scene: ParkScene,
    private readonly cb: Park2DCallbacks,
  ) {
    this.player = {
      ...scene.spawn,
      r: 13,
      speed: 175,
      targetX: null,
      targetY: null,
      walkPhase: 0,
      speech: null,
      speechTimer: 0,
    };
    this.bots = scene.bots.map((b) => ({
      ...b,
      waypoints: b.waypoints.map((w) => ({ ...w })),
      walkPhase: 0,
      wpIndex: 0,
      lineIndex: 0,
    }));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    this.ctx = ctx;
    this.resize();
    this.ensureUnstuck();
    const cam = this.desiredCamera();
    this.camX = cam.x;
    this.camY = cam.y;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(wrap);
    canvas.addEventListener("keydown", this.onKeyDown);
    canvas.addEventListener("blur", this.onBlur);
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
    this.canvas.removeEventListener("keydown", this.onKeyDown);
    this.canvas.removeEventListener("blur", this.onBlur);
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
    if (pressed) this.takeManualControl();
  }

  /** Starts a conversation from the people list: the card opens now and the player walks over. */
  talkTo(botId: string): void {
    const bot = this.bots.find((b) => b.id === botId);
    if (!bot) return;
    this.engagedBotId = bot.id;
    this.dismissedBotId = null;
    this.focusBot(bot);
  }

  /** Explicit exit from the conversation card. */
  endConversation(): void {
    this.dismissedBotId = this.activeBotId;
    this.engagedBotId = null;
    this.activeBotId = null;
    this.cb.onActiveBotChange(null);
  }

  private takeManualControl() {
    this.engagedBotId = null;
    this.clearTarget();
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
      x: Math.max(24, Math.min(this.scene.world.width - 24, sx + this.camX)),
      y: Math.max(24, Math.min(this.scene.world.height - 24, sy + this.camY)),
    };
  }

  private ensureUnstuck() {
    const p = this.player;
    if (!this.scene.collides(p.x, p.y, p.r)) return;
    for (let dist = 8; dist <= 96; dist += 8) {
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
        const nx = p.x + Math.cos(a) * dist;
        const ny = p.y + Math.sin(a) * dist;
        if (!this.scene.collides(nx, ny, p.r)) {
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
    this.takeManualControl();
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
    this.canvas.focus({ preventScroll: true });
    this.engagedBotId = null;
    const pt = this.screenToWorld(e.clientX, e.clientY);

    const { pacoca } = this.scene;
    if (pacoca && Math.hypot(pt.x - pacoca.x, pt.y - pacoca.y) < 34) this.triggerPacoca();

    const tap = this.scene.tap?.(pt);
    if (tap) {
      if (tap.toast) this.cb.onToast(tap.toast.message, tap.toast.type);
      if (tap.walkTo) this.setTarget(tap.walkTo.x, tap.walkTo.y);
      return;
    }
    for (const b of this.bots) {
      if (Math.hypot(pt.x - b.x, pt.y - b.y) < 34) {
        const below = b.y + 42;
        this.setTarget(b.x, this.scene.collides(b.x, below, this.player.r) ? b.y - 42 : below);
        if (this.activeBotId === b.id) b.lineIndex++;
        this.dismissedBotId = null;
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
      if (!this.scene.collides(p.x + vx, p.y, p.r)) p.x += vx;
      if (!this.scene.collides(p.x, p.y + vy, p.r)) p.y += vy;
      if (p.targetX !== null && Math.hypot(p.x - prevX, p.y - prevY) < 0.25 && !this.pointerWalking) {
        this.clearTarget();
      }
      p.walkPhase += dt * 11;
    } else {
      p.walkPhase = 0;
    }

    const { pacoca } = this.scene;
    if (pacoca && Math.hypot(p.x - pacoca.x, p.y - pacoca.y) < 62) this.triggerPacoca();

    const engaged = this.bots.find((b) => b.id === this.engagedBotId) ?? null;
    if (engaged) {
      const dist = Math.hypot(engaged.x - p.x, engaged.y - p.y);
      if (dist > 48) {
        const below = this.scene.collides(engaged.x, engaged.y + 42, p.r) ? -42 : 42;
        this.setTarget(engaged.x, engaged.y + below);
      } else this.engagedBotId = null;
    }

    let nearest: BotState | null = null;
    let nearestDist = TALK_RANGE;
    this.bots.forEach((b, i) => {
      const distToPlayer = Math.hypot(b.x - p.x, b.y - p.y);
      if (b.id === this.dismissedBotId && distToPlayer > TALK_RANGE + 30) this.dismissedBotId = null;
      if (distToPlayer < nearestDist && b.id !== this.dismissedBotId) {
        nearestDist = distToPlayer;
        nearest = b;
      }
      if (distToPlayer < 88 || b.pauseTimer > 0 || b.id === this.engagedBotId) {
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
      if (!this.scene.collides(nx, ny, 12)) {
        b.x = nx;
        b.y = ny;
        b.walkPhase += dt * 7.5;
      } else {
        b.wpIndex = (b.wpIndex + 1) % b.waypoints.length;
        b.pauseTimer = 1.0;
      }
    });

    const near = (this.engagedBotId ? engaged : nearest) as BotState | null;
    if (near) {
      if (this.activeBotId !== near.id) this.focusBot(near);
    } else if (this.activeBotId !== null) {
      this.activeBotId = null;
      this.cb.onActiveBotChange(null);
    }
    this.emitRoster();

    const cam = this.desiredCamera();
    const follow = this.cb.reducedMotion() ? 1 : Math.min(1, dt * 8);
    this.camX += (cam.x - this.camX) * follow;
    this.camY += (cam.y - this.camY) * follow;
  }

  /** Follows the player; a room smaller than the view sits centered instead. */
  private desiredCamera(): Point {
    const { world } = this.scene;
    const axis = (pos: number, view: number, size: number, anchor: number) =>
      view >= size ? (size - view) / 2 : Math.max(0, Math.min(size - view, pos - view * anchor));
    return {
      x: axis(this.player.x, this.viewW, world.width, 0.5),
      y: axis(this.player.y, this.viewH, world.height, this.scene.cameraAnchorY ?? 0.5),
    };
  }

  private emitRoster() {
    const p = this.player;
    const roster = this.bots
      .map((b) => ({ id: b.id, name: b.name, distance: Math.hypot(b.x - p.x, b.y - p.y) }))
      .sort((a, b) => a.distance - b.distance)
      .map(({ id, name, distance }) => ({ id, name, proximity: proximityOf(distance) }));
    const key = roster.map((r) => `${r.id}:${r.proximity}`).join("|");
    if (key === this.rosterKey) return;
    this.rosterKey = key;
    this.cb.onRosterChange(roster);
  }

  private loop = (now: number) => {
    const dt = Math.min(0.05, Math.max(0.001, (now - this.lastFrame) / 1000));
    this.lastFrame = now;
    this.frameDt = dt;
    this.update(dt);
    // Decorative motion (ripples, bobbing, pulsing marker) freezes with the OS setting.
    this.decorTime = this.cb.reducedMotion() ? 0 : this.time;
    this.draw();
    this.rafId = requestAnimationFrame(this.loop);
  };

  // ---------------------------------------------------------------- drawing

  private draw() {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = this.scene.background;
    ctx.fillRect(0, 0, this.viewW, this.viewH);
    ctx.translate(-Math.round(this.camX), -Math.round(this.camY));
    const view: ViewRect = { x: this.camX, y: this.camY, w: this.viewW, h: this.viewH };

    this.scene.drawGround(ctx, view, this.decorTime);
    this.drawTargetMarker(ctx);

    type Drawable = { y: number; draw: () => void };
    const time = this.decorTime;
    const drawables: Drawable[] = [
      ...this.scene.props
        .filter(
          (pr) => pr.maxX > view.x && pr.minX < view.x + view.w && pr.y + 40 > view.y && pr.minY < view.y + view.h,
        )
        .map((pr) => ({ y: pr.y, draw: () => this.drawProp(ctx, pr, time) })),
      ...this.bots.map((b) => ({ y: b.y, draw: () => this.drawCharacter(ctx, b, false) })),
      { y: this.player.y, draw: () => this.drawCharacter(ctx, this.player, true) },
    ];
    drawables.sort((a, b) => a.y - b.y).forEach((d) => d.draw());
    this.drawNameTag(ctx, this.player, `${this.cb.getPlayerLook().firstName} (Você)`, true);
    this.scene.drawOverlay?.(ctx, view, this.decorTime, this.player);

    const { pacoca } = this.scene;
    if (pacoca && this.pacocaSpeechTimer > 0) {
      this.drawSpeechBubble(ctx, pacoca.x, pacoca.y - 24, "Miau! 🐱 (Paçoca)");
    }
    const active = this.bots.find((b) => b.id === this.activeBotId);
    if (active) this.drawSpeechBubble(ctx, active.x, active.y - 46, this.botLine(active));
    if (this.player.speech) {
      this.drawSpeechBubble(ctx, this.player.x, this.player.y - 46, this.player.speech, true);
    }
    ctx.restore();
  }

  private drawProp(ctx: CanvasRenderingContext2D, prop: SceneProp, time: number) {
    const p = this.player;
    const hiding = !!prop.hides && prop.y > p.y && prop.hides(p.x, p.y);
    const current = this.fades.get(prop) ?? 1;
    const target = hiding ? SEE_THROUGH : 1;
    const alpha = this.cb.reducedMotion() ? target : current + (target - current) * Math.min(1, this.frameDt * 10);
    if (alpha > 0.99) {
      this.fades.delete(prop);
      prop.draw(ctx, time);
      return;
    }
    this.fades.set(prop, alpha);
    ctx.save();
    ctx.globalAlpha = alpha;
    prop.draw(ctx, time);
    ctx.restore();
  }

  private drawTargetMarker(ctx: CanvasRenderingContext2D) {
    const { targetX, targetY } = this.player;
    if (targetX === null || targetY === null) return;
    const pulse = 8 + Math.sin(this.decorTime * 8) * 3;
    ctx.strokeStyle = "rgba(222, 201, 168, 0.95)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(targetX, targetY, pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(222, 201, 168, 0.45)";
    ctx.beginPath();
    ctx.arc(targetX, targetY, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawCharacter(ctx: CanvasRenderingContext2D, ch: BotState | PlayerState, isPlayer: boolean) {
    const x = Math.round(ch.x);
    const y = Math.round(ch.y);
    const step = Math.sin(ch.walkPhase || 0) * 3.5;
    const look = isPlayer ? this.cb.getPlayerLook() : null;
    const bot = isPlayer ? null : (ch as BotState);

    if (isPlayer || bot?.id === this.activeBotId) {
      ctx.strokeStyle = isPlayer ? "#dec9a8" : "#d9e4d6";
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

    if (!isPlayer) this.drawNameTag(ctx, ch, bot!.name, false);
  }

  /** The player's tag is drawn after the scene so a block in front never hides it. */
  private drawNameTag(ctx: CanvasRenderingContext2D, ch: Point, label: string, isPlayer: boolean) {
    const x = Math.round(ch.x);
    const y = Math.round(ch.y);
    ctx.font = "bold 10px system-ui, sans-serif";
    const bw = ctx.measureText(label).width + 14;
    const by = y + 11;
    ctx.fillStyle = isPlayer ? "rgba(117, 75, 56, 0.95)" : "rgba(28, 38, 49, 0.9)";
    ctx.beginPath();
    ctx.roundRect(x - bw / 2, by, bw, 17, 8);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(label, x, by + 12);
  }

  private drawSpeechBubble(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, isPlayer = false) {
    const display = text.length > 44 ? `${text.slice(0, 42)}…` : text;
    ctx.font = "600 10.5px system-ui, sans-serif";
    const bw = Math.max(64, ctx.measureText(display).width + 18);
    const bh = 24;
    const bx = Math.round(x - bw / 2);
    const by = Math.round(y - bh);
    ctx.fillStyle = isPlayer ? "rgba(117, 75, 56, 0.96)" : "rgba(28, 38, 49, 0.94)";
    ctx.strokeStyle = isPlayer ? "rgba(222, 201, 168, 0.8)" : "rgba(245, 240, 231, 0.3)";
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
