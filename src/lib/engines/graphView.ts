import type { ForceLayout, GraphEdge } from "./interestGraph";

interface GraphViewOptions {
  container: HTMLElement;
  /** Element holding nodes and lines in graph coordinates; receives the pan/zoom transform. */
  world: HTMLElement;
  nodeEls: (HTMLElement | null)[];
  lineEls: (SVGLineElement | null)[];
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
 * pans, zooms (wheel and pinch). Owns transforms and line coordinates only; React keeps the markup.
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
  private moved = false;
  private startX = 0;
  private startY = 0;
  private pinchDist = 0;
  private pinchZoom = 1;
  private movedResetTimer: number | null = null;
  private readonly resizeObserver: ResizeObserver;

  constructor(private readonly opts: GraphViewOptions) {
    if (opts.reducedMotion()) opts.layout.settle();
    else for (let i = 0; i < 80; i++) opts.layout.tick();
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
    const { container, layout } = this.opts;
    const t = fitTransform(layout.bounds(), container.clientWidth || 360, container.clientHeight || 520);
    this.zoom = t.zoom;
    this.panX = t.panX;
    this.panY = t.panY;
    this.schedule();
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
    this.mode = nodeEl ? "node" : "pan";
    this.dragNode = nodeEl ? Number(nodeEl.dataset.nodeIndex) : -1;
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
      if (this.dragNode !== 0) this.opts.layout.pin(this.dragNode, p.x, p.y);
      this.opts.layout.reheat(0.25);
      this.layoutDirty = true;
    } else if (this.mode === "pan") {
      this.panX += (e.clientX - prev.x) / scale;
      this.panY += (e.clientY - prev.y) / scale;
    }
    this.schedule();
  };

  private onPointerUp = (e: PointerEvent) => {
    if (!this.pointers.delete(e.pointerId)) return;
    if (this.pointers.size > 0) return;
    if (this.mode === "pan" && !this.moved) this.opts.onBackgroundTap();
    this.releaseNode();
    this.mode = "idle";
    if (this.movedResetTimer !== null) window.clearTimeout(this.movedResetTimer);
    this.movedResetTimer = window.setTimeout(() => (this.moved = false), 60);
  };

  private releaseNode() {
    if (this.dragNode > 0) this.opts.layout.unpin(this.dragNode);
    this.dragNode = -1;
  }

  private loop = () => {
    this.rafId = null;
    const { world, nodeEls, lineEls, edges, layout, reducedMotion } = this.opts;
    const animate = !layout.settled && !reducedMotion();
    if (animate) {
      layout.tick();
      this.layoutDirty = true;
    } else if (!layout.settled) {
      layout.settle();
      this.layoutDirty = true;
    }

    const { cx, cy } = this.center();
    world.style.transform = `translate(${(cx + this.panX).toFixed(1)}px, ${(cy + this.panY).toFixed(1)}px) scale(${this.zoom.toFixed(3)})`;
    this.opts.container.dataset.zoom = this.zoom < 0.62 ? "far" : "near";

    if (this.layoutDirty) {
      this.layoutDirty = false;
      const { x, y } = layout;
      for (let i = 0; i < nodeEls.length; i++) {
        const el = nodeEls[i];
        if (el) el.style.transform = `translate(${x[i].toFixed(1)}px, ${y[i].toFixed(1)}px) translate(-50%, -50%)`;
      }
      for (let i = 0; i < lineEls.length; i++) {
        const line = lineEls[i];
        const e = edges[i];
        if (!line || !e) continue;
        line.setAttribute("x1", x[e.source].toFixed(1));
        line.setAttribute("y1", y[e.source].toFixed(1));
        line.setAttribute("x2", x[e.target].toFixed(1));
        line.setAttribute("y2", y[e.target].toFixed(1));
      }
    }

    if (animate || this.mode === "node") this.schedule();
  };
}
