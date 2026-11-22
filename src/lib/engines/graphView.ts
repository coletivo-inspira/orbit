import type { ForceLayout, GraphEdge, LinkOrigin } from "./interestGraph";

export interface EdgeHighlight {
  direct: ReadonlySet<number>;
  shared: ReadonlySet<number>;
  color: string;
}

const ORIGIN_STYLE: Record<LinkOrigin, { color: string; alpha: number; dash: number[] }> = {
  perfil: { color: "rgb(245 240 231)", alpha: 0.2, dash: [] },
  comunidade: { color: "#dec9a8", alpha: 0.45, dash: [5, 4] },
  musica: { color: "#1db954", alpha: 0.45, dash: [] },
};

interface GraphViewOptions {
  container: HTMLElement;
  /** Element holding the nodes in graph coordinates; receives the pan/zoom transform. */
  world: HTMLElement;
  /** Lines are drawn here: thousands of SVG lines would mean thousands of DOM writes per frame. */
  canvas: HTMLCanvasElement;
  nodeEls: (HTMLElement | null)[];
  edges: GraphEdge[];
  layout: ForceLayout;
  getScale: () => number;
  reducedMotion: () => boolean;
  /** Vertical offset of the visual center (mobile shifts up to clear the floating nav). */
  centerOffsetY: number;
  onBackgroundTap: () => void;
}

export const MIN_ZOOM = 0.3;
export const MAX_ZOOM = 2.4;
/** Above this many nodes, moving every node per frame costs more than the layout itself. */
export const BATCH_SETTLE_NODES = 120;
const BATCH_BUDGET_MS = 8;

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

/**
 * Obsidian-like graph viewport: runs the force layout while it moves, drags nodes,
 * pans, zooms (wheel and pinch). Owns node transforms and the line canvas; React keeps the markup.
 */
export class GraphViewEngine {
  private panX = 0;
  private panY = 0;
  private zoom = 1;
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
  /** Big graphs settle in time-boxed batches instead of animating every node every frame. */
  private readonly batch: boolean;
  /** Initial batch settle: nodes stay hidden (`data-settling`) until the layout rests. */
  private settling = false;

  constructor(private readonly opts: GraphViewOptions) {
    this.batch = opts.nodeEls.length > BATCH_SETTLE_NODES && !opts.reducedMotion();
    if (opts.reducedMotion()) opts.layout.settle();
    else if (this.batch) this.settling = true;
    else {
      // Pre-settle off-screen so the first frame isn't a burst.
      for (let i = 0; i < 80; i++) opts.layout.tick();
    }
    opts.container.dataset.settling = String(this.settling);
    opts.container.addEventListener("pointerdown", this.onPointerDown);
    opts.container.addEventListener("wheel", this.onWheel, { passive: false });
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("pointercancel", this.onPointerUp);
    this.resizeObserver = new ResizeObserver(() => this.schedule());
    this.resizeObserver.observe(opts.container);
    this.fit();
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

  /** True while/just after a drag, so clicks at the end of a gesture are ignored. */
  wasDragged(): boolean {
    return this.moved;
  }

  fit(): void {
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
    this.schedule();
  }

  /** Brings a node to the middle (keyboard focus). */
  reveal(index: number): void {
    const { layout } = this.opts;
    this.panX = -layout.x[index] * this.zoom;
    this.panY = -layout.y[index] * this.zoom;
    this.opts.container.scrollTop = 0;
    this.opts.container.scrollLeft = 0;
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
    // The user's own node is anchored: dragging it pans instead of reheating the whole layout.
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
      // Big graphs move only the dragged node: reheating would move every node on every frame.
      if (this.batch) this.dirtyNode = this.dragNode;
      else {
        this.opts.layout.reheat(0.25);
        this.layoutDirty = true;
      }
    } else if (this.mode === "pan") {
      this.panX += (e.clientX - prev.x) / scale;
      this.panY += (e.clientY - prev.y) / scale;
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
      this.applyFit();
    }

    const { cx, cy } = this.center();
    world.style.transform = `translate(${(cx + this.panX).toFixed(1)}px, ${(cy + this.panY).toFixed(1)}px) scale(${this.zoom.toFixed(3)})`;
    container.dataset.zoom = this.zoom < 0.62 ? "far" : "near";

    if (this.settling) {
      this.schedule();
      return;
    }
    if (this.layoutDirty) {
      this.layoutDirty = false;
      for (let i = 0; i < nodeEls.length; i++) this.placeNode(i);
    } else if (this.dirtyNode >= 0) this.placeNode(this.dirtyNode);
    this.dirtyNode = -1;
    this.drawEdges(cx, cy);

    if (running || (this.mode === "node" && !this.batch)) this.schedule();
  };

  private placeNode(i: number) {
    const el = this.opts.nodeEls[i];
    const { x, y } = this.opts.layout;
    if (el) el.style.transform = `translate(${x[i].toFixed(1)}px, ${y[i].toFixed(1)}px) translate(-50%, -50%)`;
  }

  private drawEdges(cx: number, cy: number) {
    const { canvas, container, edges, layout } = this.opts;
    const w = container.clientWidth || 360;
    const h = container.clientHeight || 520;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const z = this.zoom;
    ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (cx + this.panX), dpr * (cy + this.panY));

    const { x, y } = layout;
    const hl = this.highlight;
    // One path per style keeps state changes (and the cost) flat no matter how many lines there are.
    const stroke = (
      pick: (i: number, e: GraphEdge) => boolean,
      color: string,
      alpha: number,
      width: number,
      dash: number[],
    ) => {
      ctx.beginPath();
      for (let i = 0; i < edges.length; i++) {
        const e = edges[i];
        if (!pick(i, e)) continue;
        ctx.moveTo(x[e.source], y[e.source]);
        ctx.lineTo(x[e.target], y[e.target]);
      }
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = width / z;
      ctx.setLineDash(dash.map((d) => d / z));
      ctx.stroke();
    };
    for (const origin of Object.keys(ORIGIN_STYLE) as LinkOrigin[]) {
      const s = ORIGIN_STYLE[origin];
      const rest = (i: number, e: GraphEdge) => e.origin === origin && !hl?.direct.has(i) && !hl?.shared.has(i);
      stroke(rest, s.color, hl ? 0.05 : s.alpha, 1, s.dash);
      if (hl) stroke((i, e) => e.origin === origin && hl.shared.has(i), s.color, 0.4, 1, s.dash);
    }
    if (hl) stroke((i) => hl.direct.has(i), hl.color, 0.95, 2.2, []);
    ctx.globalAlpha = 1;
  }
}
