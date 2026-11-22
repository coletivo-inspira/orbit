import type { ForceLayout, LayoutForces } from "./forceLayout";

export interface EdgeHighlight {
  direct: ReadonlySet<number>;
  shared: ReadonlySet<number>;
  color: string;
}

export interface EdgeStyle {
  color: string;
  alpha: number;
  dash: number[];
}

export interface ViewEdge {
  source: number;
  target: number;
}

/** Display settings the engine draws with (the rest of the panel is applied by React or the layout). */
export interface GraphViewDisplay {
  /** Line width multiplier (1 = default). */
  linkWidth: number;
  arrows: boolean;
  /** Below this zoom, secondary labels hide (`data-zoom="far"`). */
  labelZoom: number;
}

export interface GraphViewState {
  zoom: number;
  panX: number;
  panY: number;
  /** The user panned or zoomed: later rebuilds keep the camera instead of refitting. */
  userMoved: boolean;
}

interface GraphViewOptions<E extends ViewEdge> {
  container: HTMLElement;
  /** Element holding the nodes in graph coordinates; receives the pan/zoom transform. */
  world: HTMLElement;
  /** Lines are drawn here: thousands of SVG lines would mean thousands of DOM writes per frame. */
  canvas: HTMLCanvasElement;
  nodeEls: (HTMLElement | null)[];
  edges: E[];
  edgeStyles: Record<string, EdgeStyle>;
  styleOf: (edge: E) => string;
  layout: ForceLayout;
  getScale: () => number;
  reducedMotion: () => boolean;
  /** Vertical offset of the visual center (mobile shifts up to clear the floating nav). */
  centerOffsetY: number;
  onBackgroundTap: () => void;
  display?: GraphViewDisplay;
  /** Camera of the previous engine on the same view, so a rebuild doesn't throw the user's zoom away. */
  initialView?: GraphViewState | null;
}

export const MIN_ZOOM = 0.3;
export const MAX_ZOOM = 2.4;
/** Above this many nodes, moving every node per frame costs more than the layout itself. */
export const BATCH_SETTLE_NODES = 120;
const BATCH_BUDGET_MS = 8;
const EDGE_GROW_MS = 420;
const FOLLOW_EASE = 0.12;
export const DEFAULT_VIEW_DISPLAY: GraphViewDisplay = { linkWidth: 1, arrows: false, labelZoom: 0.62 };

export function clampZoom(z: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

/** Zoom and pan that fit the given bounds inside a w×h box with some margin. */
export function fitTransform(
  b: { minX: number; minY: number; maxX: number; maxY: number },
  w: number,
  h: number,
): { zoom: number; panX: number; panY: number } {
  const bw = Math.max(1, b.maxX - b.minX + 120);
  const bh = Math.max(1, b.maxY - b.minY + 120);
  const zoom = clampZoom(Math.min(w / bw, h / bh, 1.2));
  return { zoom, panX: (-(b.minX + b.maxX) / 2) * zoom, panY: (-(b.minY + b.maxY) / 2) * zoom };
}

/** Fraction of a newly revealed line already drawn, `elapsed` ms after it appeared. */
export function edgeGrowth(elapsed: number): number {
  if (elapsed >= EDGE_GROW_MS) return 1;
  const t = Math.max(0, elapsed / EDGE_GROW_MS);
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Obsidian-like graph viewport: runs the force layout while it moves, drags nodes,
 * pans, zooms (wheel and pinch). Owns node transforms and the line canvas; React keeps the markup.
 */
export class GraphViewEngine<E extends ViewEdge = ViewEdge> {
  private panX = 0;
  private panY = 0;
  private zoom = 1;
  private userMoved = false;
  private rafId: number | null = null;
  private layoutDirty = true;
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private mode: "idle" | "pan" | "node" | "pinch" = "idle";
  private dragNode = -1;
  private downOnNode = false;
  private dirtyNode = -1;
  private moved = false;
  private startX = 0;
  private startY = 0;
  private pinchDist = 0;
  private pinchZoom = 1;
  private movedResetTimer: number | null = null;
  private readonly resizeObserver: ResizeObserver;
  private highlight: EdgeHighlight | null = null;
  private display: GraphViewDisplay;
  /** When each line was revealed (timelapse); 0 = shown from the start. */
  private readonly edgeBorn: Float64Array;
  /** Big graphs settle in time-boxed batches instead of animating every node every frame. */
  private readonly batch: boolean;
  /** Initial batch settle: nodes stay hidden (`data-settling`) until the layout rests. */
  private settling = false;

  constructor(private readonly opts: GraphViewOptions<E>) {
    this.display = opts.display ?? DEFAULT_VIEW_DISPLAY;
    this.edgeBorn = new Float64Array(opts.edges.length);
    this.batch = opts.nodeEls.length > BATCH_SETTLE_NODES && !opts.reducedMotion();
    const warm = opts.layout.alpha < 1;
    if (opts.reducedMotion()) opts.layout.settle();
    else if (this.batch && !warm) this.settling = true;
    else if (!warm) {
      // Pre-settle off-screen so the first frame isn't a burst.
      for (let i = 0; i < 80; i++) opts.layout.tick();
    }
    opts.container.dataset.settling = String(this.settling);
    opts.container.addEventListener("pointerdown", this.onPointerDown);
    opts.container.addEventListener("wheel", this.onWheel, { passive: false });
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("pointercancel", this.onPointerUp);
    this.resizeObserver = new ResizeObserver(() => {
      if (!this.userMoved && !this.settling) this.applyFit();
      this.schedule();
    });
    this.resizeObserver.observe(opts.container);
    const view = opts.initialView;
    if (view?.userMoved) {
      this.zoom = view.zoom;
      this.panX = view.panX;
      this.panY = view.panY;
      this.userMoved = true;
      this.schedule();
    } else this.fit();
  }

  destroy(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    if (this.movedResetTimer !== null) window.clearTimeout(this.movedResetTimer);
    this.resizeObserver.disconnect();
    this.opts.container.removeEventListener("pointerdown", this.onPointerDown);
    this.opts.container.removeEventListener("wheel", this.onWheel);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("pointercancel", this.onPointerUp);
  }

  /** Camera to hand to the next engine when the graph is rebuilt. */
  view(): GraphViewState {
    return { zoom: this.zoom, panX: this.panX, panY: this.panY, userMoved: this.userMoved };
  }

  /** True while/just after a drag, so clicks at the end of a gesture are ignored. */
  wasDragged(): boolean {
    return this.moved;
  }

  /** "Ajustar": fits the graph and lets the camera follow the layout again. */
  fit(): void {
    this.userMoved = false;
    this.applyFit();
    this.schedule();
  }

  private applyFit() {
    const { container, layout } = this.opts;
    const t = fitTransform(layout.bounds(), container.clientWidth || 360, container.clientHeight || 520);
    this.zoom = t.zoom;
    this.panX = t.panX;
    this.panY = t.panY;
  }

  zoomBy(factor: number): void {
    const next = clampZoom(this.zoom * factor);
    this.panX *= next / this.zoom;
    this.panY *= next / this.zoom;
    this.zoom = next;
    this.userMoved = true;
    this.schedule();
  }

  /** Brings a node to the middle (keyboard focus). */
  reveal(index: number): void {
    const { layout } = this.opts;
    this.panX = -layout.x[index] * this.zoom;
    this.panY = -layout.y[index] * this.zoom;
    this.userMoved = true;
    this.opts.container.scrollTop = 0;
    this.opts.container.scrollLeft = 0;
    this.schedule();
  }

  setDisplay(display: GraphViewDisplay): void {
    this.display = display;
    this.schedule();
  }

  /** New force multipliers: the layout reheats so the change is visible. */
  setForces(forces: LayoutForces, radiusScale: number): void {
    const { layout } = this.opts;
    const changed =
      radiusScale !== layout.radiusScale ||
      (Object.keys(forces) as (keyof LayoutForces)[]).some((k) => forces[k] !== layout.forces[k]);
    if (!changed) return;
    layout.forces = { ...forces };
    layout.radiusScale = radiusScale;
    if (this.opts.reducedMotion()) layout.settle();
    else layout.reheat(0.5);
    this.layoutDirty = true;
    this.schedule();
  }

  /** Replays the layout from its initial spiral, with the camera following it ("Animar"). */
  replay(): void {
    const { layout } = this.opts;
    layout.reset();
    if (this.opts.reducedMotion()) layout.settle();
    this.userMoved = false;
    this.settling = false;
    this.opts.container.dataset.settling = "false";
    this.layoutDirty = true;
    this.schedule();
  }

  /** Timelapse: only these nodes take part; newly active ones grow out of `near[i]` with their lines. */
  setActive(active: ArrayLike<number>, near: ArrayLike<number>): void {
    const { layout, edges } = this.opts;
    const now = performance.now();
    const born: number[] = [];
    for (let i = 0; i < layout.active.length; i++) {
      const next = active[i] ? 1 : 0;
      if (next && !layout.active[i]) born.push(i);
      layout.active[i] = next;
    }
    for (const i of born) if (near[i] >= 0 && i !== 0) layout.placeNear(i, near[i]);
    const isBorn = new Set(born);
    for (let e = 0; e < edges.length; e++) {
      if (isBorn.has(edges[e].source) || isBorn.has(edges[e].target)) this.edgeBorn[e] = now;
    }
    if (this.opts.reducedMotion()) layout.settle();
    else if (born.length) layout.reheat(0.3);
    this.layoutDirty = true;
    this.schedule();
  }

  private schedule() {
    if (this.rafId === null) this.rafId = requestAnimationFrame(this.loop);
  }

  private center() {
    const { container, centerOffsetY } = this.opts;
    return { cx: (container.clientWidth || 360) / 2, cy: (container.clientHeight || 520) / 2 - centerOffsetY };
  }

  private toLocal(clientX: number, clientY: number) {
    const rect = this.opts.container.getBoundingClientRect();
    const scale = this.opts.getScale() || 1;
    return { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale };
  }

  private toGraph(clientX: number, clientY: number) {
    const local = this.toLocal(clientX, clientY);
    const { cx, cy } = this.center();
    return { x: (local.x - cx - this.panX) / this.zoom, y: (local.y - cy - this.panY) / this.zoom };
  }

  private zoomAt(clientX: number, clientY: number, nextZoom: number) {
    const local = this.toLocal(clientX, clientY);
    const { cx, cy } = this.center();
    const z = clampZoom(nextZoom);
    const gx = (local.x - cx - this.panX) / this.zoom;
    const gy = (local.y - cy - this.panY) / this.zoom;
    this.zoom = z;
    this.panX = local.x - cx - gx * z;
    this.panY = local.y - cy - gy * z;
    this.userMoved = true;
    this.schedule();
  }

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.zoomAt(e.clientX, e.clientY, this.zoom * Math.exp(-e.deltaY * 0.0015));
  };

  private onPointerDown = (e: PointerEvent) => {
    if ((e.target as Element).closest("[data-graph-control]")) return;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.releaseNode();
      this.mode = "pinch";
      this.pinchDist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      this.pinchZoom = this.zoom;
      this.moved = true;
      return;
    }
    const nodeEl = (e.target as Element).closest<HTMLElement>("[data-node-index]");
    const index = nodeEl ? Number(nodeEl.dataset.nodeIndex) : -1;
    // The anchored center node pans instead of reheating the whole layout.
    this.mode = index > 0 ? "node" : "pan";
    this.dragNode = index;
    this.downOnNode = index >= 0;
    this.moved = false;
    this.startX = e.clientX;
    this.startY = e.clientY;
  };

  private onPointerMove = (e: PointerEvent) => {
    const prev = this.pointers.get(e.pointerId);
    if (!prev) return;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const scale = this.opts.getScale() || 1;

    if (this.mode === "pinch" && this.pointers.size >= 2) {
      const [a, b] = [...this.pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      this.zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, (this.pinchZoom * dist) / this.pinchDist);
      return;
    }
    if (!this.moved && Math.hypot(e.clientX - this.startX, e.clientY - this.startY) / scale > 4) this.moved = true;
    if (!this.moved) return;

    if (this.mode === "node" && this.dragNode >= 0) {
      const p = this.toGraph(e.clientX, e.clientY);
      this.opts.layout.pin(this.dragNode, p.x, p.y);
      this.userMoved = true;
      // Big graphs move only the dragged node: reheating would move every node on every frame.
      if (this.batch) this.dirtyNode = this.dragNode;
      else {
        this.opts.layout.reheat(0.25);
        this.layoutDirty = true;
      }
    } else if (this.mode === "pan") {
      this.panX += (e.clientX - prev.x) / scale;
      this.panY += (e.clientY - prev.y) / scale;
      this.userMoved = true;
    }
    this.schedule();
  };

  private onPointerUp = (e: PointerEvent) => {
    if (!this.pointers.delete(e.pointerId)) return;
    if (this.pointers.size > 0) return;
    if (this.mode === "pan" && !this.moved && !this.downOnNode) this.opts.onBackgroundTap();
    this.releaseNode();
    this.mode = "idle";
    if (this.movedResetTimer !== null) window.clearTimeout(this.movedResetTimer);
    this.movedResetTimer = window.setTimeout(() => (this.moved = false), 60);
  };

  private releaseNode() {
    if (this.dragNode > 0) this.opts.layout.unpin(this.dragNode);
    this.dragNode = -1;
  }

  /** Restyles the lines for the focused node (or clears the focus). */
  setHighlight(highlight: EdgeHighlight | null): void {
    this.highlight = highlight;
    this.schedule();
  }

  private loop = () => {
    this.rafId = null;
    const { container, world, nodeEls, layout, reducedMotion } = this.opts;
    let running = false;
    if (!layout.settled) {
      if (reducedMotion()) layout.settle();
      else if (this.batch) {
        const deadline = performance.now() + BATCH_BUDGET_MS;
        do layout.tick();
        while (!layout.settled && performance.now() < deadline);
        running = !layout.settled;
      } else {
        layout.tick();
        running = true;
      }
      this.layoutDirty = true;
    }
    if (this.settling && layout.settled) {
      this.settling = false;
      container.dataset.settling = "false";
      if (!this.userMoved) this.applyFit();
    }
    // The camera follows the layout as it grows until the user takes over, and keeps easing until it catches up.
    let following = false;
    if (!this.settling && !this.userMoved) {
      const t = fitTransform(layout.bounds(), container.clientWidth || 360, container.clientHeight || 520);
      const dz = t.zoom - this.zoom;
      const dx = t.panX - this.panX;
      const dy = t.panY - this.panY;
      following = Math.abs(dz) > 0.002 || Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5;
      const ease = reducedMotion() ? 1 : FOLLOW_EASE;
      this.zoom += dz * ease;
      this.panX += dx * ease;
      this.panY += dy * ease;
    }

    const { cx, cy } = this.center();
    world.style.transform = `translate(${(cx + this.panX).toFixed(1)}px, ${(cy + this.panY).toFixed(1)}px) scale(${this.zoom.toFixed(3)})`;
    container.dataset.zoom = this.zoom < this.display.labelZoom ? "far" : "near";

    if (this.settling) {
      this.schedule();
      return;
    }
    if (this.layoutDirty) {
      this.layoutDirty = false;
      for (let i = 0; i < nodeEls.length; i++) this.placeNode(i);
    } else if (this.dirtyNode >= 0) this.placeNode(this.dirtyNode);
    this.dirtyNode = -1;
    const growing = this.drawEdges(cx, cy);

    if (running || growing || following || (this.mode === "node" && !this.batch)) this.schedule();
  };

  private placeNode(i: number) {
    const el = this.opts.nodeEls[i];
    const { x, y } = this.opts.layout;
    if (el) el.style.transform = `translate(${x[i].toFixed(1)}px, ${y[i].toFixed(1)}px) translate(-50%, -50%)`;
  }

  /** Returns whether some line is still growing (another frame is needed). */
  private drawEdges(cx: number, cy: number): boolean {
    const { canvas, container, edges, layout, edgeStyles, styleOf } = this.opts;
    const w = container.clientWidth || 360;
    const h = container.clientHeight || 520;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const z = this.zoom;
    ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (cx + this.panX), dpr * (cy + this.panY));

    const { x, y, active } = layout;
    const hl = this.highlight;
    const { linkWidth, arrows } = this.display;
    const now = performance.now();
    let growing = false;
    const growth = (i: number) => {
      const born = this.edgeBorn[i];
      if (!born) return 1;
      const g = edgeGrowth(now - born);
      if (g < 1) growing = true;
      return g;
    };
    // One path per style keeps state changes (and the cost) flat no matter how many lines there are.
    const stroke = (
      pick: (i: number, e: E) => boolean,
      color: string,
      alpha: number,
      width: number,
      dash: number[],
    ) => {
      ctx.beginPath();
      const heads: number[] = [];
      for (let i = 0; i < edges.length; i++) {
        const e = edges[i];
        if (!active[e.source] || !active[e.target] || !pick(i, e)) continue;
        const g = growth(i);
        const tx = x[e.source] + (x[e.target] - x[e.source]) * g;
        const ty = y[e.source] + (y[e.target] - y[e.source]) * g;
        ctx.moveTo(x[e.source], y[e.source]);
        ctx.lineTo(tx, ty);
        if (arrows && g === 1) heads.push(i);
      }
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = (width * linkWidth) / z;
      ctx.setLineDash(dash.map((d) => d / z));
      ctx.stroke();
      if (!heads.length) return;
      // Arrowheads stop at the target's edge, so they stay visible on top of avatars.
      ctx.beginPath();
      const size = (4 + 2 * linkWidth) / Math.max(z, 0.5);
      for (const i of heads) {
        const e = edges[i];
        const dx = x[e.target] - x[e.source];
        const dy = y[e.target] - y[e.source];
        const len = Math.hypot(dx, dy);
        const r = layout.radiusOf(e.target) + 2;
        if (len <= r + size) continue;
        const ux = dx / len;
        const uy = dy / len;
        const tipX = x[e.target] - ux * r;
        const tipY = y[e.target] - uy * r;
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(tipX - ux * size - uy * size * 0.55, tipY - uy * size + ux * size * 0.55);
        ctx.lineTo(tipX - ux * size + uy * size * 0.55, tipY - uy * size - ux * size * 0.55);
        ctx.closePath();
      }
      ctx.fillStyle = color;
      ctx.fill();
    };
    for (const [key, s] of Object.entries(edgeStyles)) {
      const rest = (i: number, e: E) => styleOf(e) === key && !hl?.direct.has(i) && !hl?.shared.has(i);
      stroke(rest, s.color, hl ? 0.05 : s.alpha, 1, s.dash);
      if (hl) stroke((i, e) => styleOf(e) === key && hl.shared.has(i), s.color, 0.4, 1, s.dash);
    }
    if (hl) stroke((i) => hl.direct.has(i), hl.color, 0.95, 2.2, []);
    ctx.globalAlpha = 1;
    return growing;
  }
}
