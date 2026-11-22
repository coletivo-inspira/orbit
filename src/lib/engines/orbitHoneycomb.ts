import type { Point } from "@/lib/data/park";

/** Positions on concentric hexagonal rings around (0, 0), innermost first. */
export function hexRingPositions(count: number, spacing: number): Point[] {
  const coords: Point[] = [];
  const startAngle = Math.PI / 6;
  for (let ring = 1; coords.length < count; ring++) {
    for (let side = 0; side < 6 && coords.length < count; side++) {
      const a1 = startAngle + (side * Math.PI) / 3;
      const a2 = startAngle + ((side + 1) * Math.PI) / 3;
      for (let step = 0; step < ring && coords.length < count; step++) {
        const t = step / ring;
        coords.push({
          x: (Math.cos(a1) * (1 - t) + Math.cos(a2) * t) * ring * spacing,
          y: (Math.sin(a1) * (1 - t) + Math.sin(a2) * t) * ring * spacing,
        });
      }
    }
  }
  return coords;
}

/** Pan bound that lets the outer rings reach the middle without letting the user lose the radar. */
export function maxPanFor(positions: Point[], isWatch: boolean): number {
  const outer = positions.reduce((m, p) => Math.max(m, Math.hypot(p.x, p.y)), 0);
  return Math.max(isWatch ? 165 : 240, Math.round(outer * 0.82));
}

/** Apple Watch–style fisheye: bubbles are larger near the center and shrink/fade toward the edges. */
export function fisheye(distance: number, maxDistance: number): { scale: number; opacity: number; norm: number } {
  const norm = Math.min(1, distance / Math.max(120, maxDistance));
  return { norm, scale: 1.12 - norm * 0.56, opacity: 1 - Math.pow(norm, 2.2) * 0.52 };
}

export interface OrbitNode {
  el: HTMLElement;
  labelEl: HTMLElement | null;
  bx: number;
  by: number;
}

interface EngineOptions {
  container: HTMLElement;
  centerEl: HTMLElement;
  nodes: OrbitNode[];
  isWatch: boolean;
  maxPan?: number;
  /** Vertical offset of the visual center (mobile shifts up to clear the floating nav). */
  centerOffsetY: number;
  getScale: () => number;
  /** Read on every interaction so a change of the OS setting applies immediately. */
  reducedMotion: () => boolean;
}

const REST_SPEED = 0.05;

/** Pan that brings a node at (bx, by) close to the center; the elastic bound keeps outer rings partly off-center. */
export function panToReveal(bx: number, by: number, maxPan: number): { x: number; y: number } {
  const d = Math.hypot(bx, by);
  if (d <= maxPan || d === 0) return { x: -bx, y: -by };
  return { x: (-bx / d) * maxPan, y: (-by / d) * maxPan };
}

/**
 * Drag-to-pan radial honeycomb with inertia and an elastic bound. Owns only
 * transforms/opacity of elements React rendered; React keeps the markup.
 * Frames are only scheduled while something moves, so an idle radar costs nothing.
 */
export class OrbitHoneycombEngine {
  private panX = 0;
  private panY = 0;
  private velX = 0;
  private velY = 0;
  private dragging = false;
  private moved = false;
  private lastX = 0;
  private lastY = 0;
  private rafId: number | null = null;
  private movedResetTimer: number | null = null;
  private readonly resizeObserver: ResizeObserver;

  constructor(private readonly opts: EngineOptions) {
    opts.container.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("pointercancel", this.onPointerUp);
    this.resizeObserver = new ResizeObserver(() => this.schedule());
    this.resizeObserver.observe(opts.container);
    this.loop();
  }

  private get maxPan() {
    return this.opts.maxPan ?? (this.opts.isWatch ? 165 : 240);
  }

  /** True while/just after a drag, so bubble clicks at the end of a pan are ignored. */
  wasDragged(): boolean {
    return this.moved;
  }

  recenter(): void {
    if (this.opts.reducedMotion()) {
      this.jumpTo(0, 0);
      return;
    }
    this.velX = -this.panX * 0.18;
    this.velY = -this.panY * 0.18;
    this.schedule();
  }

  /** Keeps a keyboard-focused bubble fully inside the visible field. */
  reveal(index: number): void {
    const node = this.opts.nodes[index];
    if (!node) return;
    const target = panToReveal(node.bx, node.by, this.maxPan);
    this.opts.container.scrollTop = 0;
    this.opts.container.scrollLeft = 0;
    this.jumpTo(target.x, target.y);
  }

  destroy(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    if (this.movedResetTimer !== null) window.clearTimeout(this.movedResetTimer);
    this.resizeObserver.disconnect();
    this.opts.container.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("pointercancel", this.onPointerUp);
  }

  /** Whether a frame is pending; exposed for tests and profiling. */
  isAnimating(): boolean {
    return this.rafId !== null;
  }

  private jumpTo(x: number, y: number) {
    this.panX = x;
    this.panY = y;
    this.velX = 0;
    this.velY = 0;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.loop();
  }

  private schedule() {
    if (this.rafId === null) this.rafId = requestAnimationFrame(this.loop);
  }

  private onPointerDown = (e: PointerEvent) => {
    this.dragging = true;
    this.moved = false;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.velX = 0;
    this.velY = 0;
    this.schedule();
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.dragging) return;
    const scale = this.opts.getScale() || 1;
    const dx = (e.clientX - this.lastX) / scale;
    const dy = (e.clientY - this.lastY) / scale;
    if (Math.hypot(dx, dy) > 2.5) this.moved = true;
    this.panX += dx;
    this.panY += dy;
    this.velX = dx * 0.7;
    this.velY = dy * 0.7;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.schedule();
  };

  private onPointerUp = () => {
    if (!this.dragging) return;
    this.dragging = false;
    if (this.opts.reducedMotion()) {
      this.velX = 0;
      this.velY = 0;
      const distPan = Math.hypot(this.panX, this.panY);
      if (distPan > this.maxPan) {
        this.panX = (this.panX / distPan) * this.maxPan;
        this.panY = (this.panY / distPan) * this.maxPan;
      }
    }
    this.schedule();
    this.movedResetTimer = window.setTimeout(() => {
      this.moved = false;
    }, 60);
  };

  private loop = () => {
    this.rafId = null;
    const { container, centerEl, nodes, isWatch, centerOffsetY } = this.opts;
    const w = container.clientWidth || 360;
    const h = container.clientHeight || 520;
    const cx = w / 2;
    const cy = h / 2 - centerOffsetY;
    let settling = false;

    if (!this.dragging) {
      this.panX += this.velX;
      this.panY += this.velY;
      this.velX *= 0.9;
      this.velY *= 0.9;
      if (Math.abs(this.velX) < REST_SPEED && Math.abs(this.velY) < REST_SPEED) {
        this.velX = 0;
        this.velY = 0;
      } else {
        settling = true;
      }
      const distPan = Math.hypot(this.panX, this.panY);
      if (distPan > this.maxPan + 0.5) {
        const pull = (distPan - this.maxPan) * 0.12;
        this.panX -= (this.panX / distPan) * pull;
        this.panY -= (this.panY / distPan) * pull;
        settling = true;
      }
    }

    centerEl.style.left = `${cx}px`;
    centerEl.style.top = `${cy}px`;

    const maxDist = Math.min(w, h) * 0.56;
    const minClear = isWatch ? 54 : 84;

    for (const n of nodes) {
      let rx = n.bx + this.panX;
      let ry = n.by + this.panY;
      // Push bubbles out so none sits right behind the user's own avatar.
      const dCenter = Math.hypot(rx, ry);
      if (dCenter > 0.1 && dCenter < minClear) {
        const push = minClear - dCenter;
        rx += (rx / dCenter) * push;
        ry += (ry / dCenter) * push;
      }
      const { scale, opacity, norm } = fisheye(Math.hypot(rx, ry), maxDist);
      n.el.style.transform = `translate3d(${(cx + rx).toFixed(1)}px, ${(cy + ry).toFixed(1)}px, 0) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
      n.el.style.opacity = opacity.toFixed(3);
      n.el.style.zIndex = String(Math.round((1 - norm) * 15) + 1);
      if (n.labelEl) n.labelEl.style.opacity = scale > 0.72 ? "1" : "0";
    }

    if (this.dragging || settling) this.schedule();
  };
}
