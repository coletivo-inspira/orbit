import type { ForceLayout, LayoutForces } from "./forceLayout";
import { AvatarSprites, labelSize, LabelSprites, type AvatarSource } from "./graphSprites";

export interface EdgeStyle {
  color: string;
  alpha: number;
  dash: number[];
}

export interface ViewEdge {
  source: number;
  target: number;
}

/** How a node is drawn on the canvas. */
export interface VisualNode {
  id: string;
  /** Radius in graph px at zoom 1 and node size 1. */
  radius: number;
  kind: "avatar" | "dot" | "badge";
  avatar?: AvatarSource;
  /** Dot fill, or the badge background. */
  fill?: string;
  ring?: string;
  /** Ring width in graph px at zoom 1; it scales with the node. */
  ringWidth?: number;
  /** Emoji or initial drawn inside a badge. */
  glyph?: string;
  label: string;
  labelColor?: string;
  /** Labeled at any zoom (the user, posts); the rest follow the text threshold. */
  alwaysLabel?: boolean;
}

/** Display settings the engine draws with (the forces are applied by the layout). */
export interface GraphViewDisplay {
  /** Line width multiplier (1 = default). */
  linkWidth: number;
  arrows: boolean;
  /** Below this zoom, secondary labels fade out. */
  labelZoom: number;
  nodeSize: number;
  /** Dragged nodes stay where they are dropped. */
  pinOnDrag: boolean;
}

export interface GraphViewState {
  zoom: number;
  panX: number;
  panY: number;
  /** The user panned or zoomed: later rebuilds keep the camera instead of refitting. */
  userMoved: boolean;
}

export interface Neighborhood {
  nodes: ReadonlySet<number>;
  direct: ReadonlySet<number>;
  shared?: ReadonlySet<number>;
}

export type PinMap = Map<string, { x: number; y: number }>;

interface GraphViewOptions<E extends ViewEdge> {
  container: HTMLElement;
  canvas: HTMLCanvasElement;
  nodes: VisualNode[];
  edges: E[];
  /** Edge indices touching each node. */
  incident: number[][];
  edgeStyles: Record<string, EdgeStyle>;
  styleOf: (edge: E) => string;
  layout: ForceLayout;
  getScale: () => number;
  reducedMotion: () => boolean;
  /** Vertical offset of the visual center (mobile shifts up to clear the floating nav). */
  centerOffsetY: number;
  onNodeClick: (index: number) => void;
  onBackgroundTap: () => void;
  onPinsChange?: (pins: PinMap) => void;
  /** What lights up around a hovered or focused node; defaults to its direct links. */
  neighborhood?: (index: number) => Neighborhood;
  display?: GraphViewDisplay;
  /** Camera of the previous engine on the same view, so a rebuild doesn't throw the user's zoom away. */
  initialView?: GraphViewState | null;
  /** Nodes the user pinned earlier, by id. */
  pins?: PinMap | null;
}

export const MIN_ZOOM = 0.3;
export const MAX_ZOOM = 3;
const EDGE_GROW_MS = 420;
const POP_MS = 480;
const FOLLOW_EASE = 0.12;
const DOUBLE_CLICK_MS = 320;
/** Only the very first, chaotic ticks run several per frame; the rest of the motion is shown. */
const HOT_ALPHA = 0.6;
const TICK_BUDGET_MS = 6;
/** Keeps neighbours moving while something is dragged. */
const DRAG_ALPHA = 0.3;
export const HIGHLIGHT = "#a78bfa";
const LABEL_FONT_PX = 11;
const ARROW_MIN_ZOOM = 0.55;

export const DEFAULT_VIEW_DISPLAY: GraphViewDisplay = {
  linkWidth: 1,
  arrows: true,
  labelZoom: 0.8,
  nodeSize: 1,
  pinOnDrag: true,
};

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

/** Scale of a node popping in, `elapsed` ms after it appeared (overshoots slightly). */
export function popScale(elapsed: number): number {
  if (elapsed >= POP_MS) return 1;
  const t = Math.max(0, elapsed / POP_MS) - 1;
  const k = 1.7;
  return 1 + (k + 1) * t * t * t + k * t * t;
}

/** Label opacity for a zoom level: fades in just below the threshold instead of popping. */
export function labelOpacity(zoom: number, labelZoom: number): number {
  return Math.min(1, Math.max(0, (zoom - labelZoom * 0.8) / (labelZoom * 0.2)));
}

/** Index of the topmost node whose disc contains (x, y), in graph coordinates. */
export function hitTest(
  x: number,
  y: number,
  xs: ArrayLike<number>,
  ys: ArrayLike<number>,
  radius: (i: number) => number,
  active: ArrayLike<number>,
  slop = 0,
): number {
  let best = -1;
  let bestD = Infinity;
  for (let i = xs.length - 1; i >= 0; i--) {
    if (!active[i]) continue;
    const d = Math.hypot(x - xs[i], y - ys[i]);
    if (d <= radius(i) + slop && d < bestD) {
      best = i;
      bestD = d;
    }
  }
  return best;
}

/**
 * Obsidian-like graph viewport drawn entirely on one canvas: lines, avatars and labels are painted at
 * devicePixelRatio × zoom every frame, so they stay sharp at any zoom, and moving 450 nodes costs one
 * canvas redraw instead of 450 DOM transforms. Runs the force layout, drags (with pinning), pans,
 * zooms (wheel and pinch), hovers and highlights. React keeps the accessible controls around it.
 */
export class GraphViewEngine<E extends ViewEdge = ViewEdge> {
  private panX = 0;
  private panY = 0;
  private zoom = 1;
  private userMoved = false;
  private rafId: number | null = null;
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private mode: "idle" | "pan" | "node" | "pinch" = "idle";
  private dragNode = -1;
  private downNode = -1;
  private moved = false;
  private startX = 0;
  private startY = 0;
  private pinchDist = 0;
  private pinchZoom = 1;
  private lastClick = { index: -1, time: 0 };
  private readonly resizeObserver: ResizeObserver;
  private display: GraphViewDisplay;
  private hover = -1;
  private focus = -1;
  private keyboardFocus = -1;
  private search: ReadonlySet<number> | null = null;
  private fresh: ReadonlySet<number> | null = null;
  /** Nodes the user pinned (node 0 is always anchored and is not one of them). */
  private readonly userPins = new Set<number>();
  /** When each line / node was revealed (timelapse); 0 = shown from the start. */
  private readonly edgeBorn: Float64Array;
  private readonly nodeBorn: Float64Array;
  private readonly sprites: AvatarSprites;
  private readonly labelSprites: LabelSprites;
  private anchor: { el: HTMLElement; index: number } | null = null;
  private readonly font: string;
  private readonly ctx: CanvasRenderingContext2D | null;

  constructor(private readonly opts: GraphViewOptions<E>) {
    this.display = opts.display ?? DEFAULT_VIEW_DISPLAY;
    this.edgeBorn = new Float64Array(opts.edges.length);
    this.nodeBorn = new Float64Array(opts.nodes.length);
    this.sprites = new AvatarSprites(() => this.schedule());
    this.ctx = opts.canvas.getContext("2d");
    this.font = getComputedStyle(opts.container).fontFamily || "system-ui, sans-serif";
    this.labelSprites = new LabelSprites(this.font);
    opts.pins?.forEach((p, id) => {
      const i = opts.nodes.findIndex((n) => n.id === id);
      if (i <= 0 || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
      opts.layout.pin(i, p.x, p.y);
      this.userPins.add(i);
    });
    const warm = opts.layout.alpha < 1;
    if (opts.reducedMotion()) opts.layout.settle();
    else if (!warm) {
      // Pre-settle the chaotic first ticks so the first frame isn't a burst.
      for (let i = 0; i < 40; i++) opts.layout.tick();
    }
    opts.container.addEventListener("pointerdown", this.onPointerDown);
    opts.container.addEventListener("pointermove", this.onHoverMove);
    opts.container.addEventListener("pointerleave", this.onPointerLeave);
    opts.container.addEventListener("wheel", this.onWheel, { passive: false });
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("pointercancel", this.onPointerUp);
    this.resizeObserver = new ResizeObserver(() => this.schedule());
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
    this.resizeObserver.disconnect();
    const { container } = this.opts;
    container.removeEventListener("pointerdown", this.onPointerDown);
    container.removeEventListener("pointermove", this.onHoverMove);
    container.removeEventListener("pointerleave", this.onPointerLeave);
    container.removeEventListener("wheel", this.onWheel);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("pointercancel", this.onPointerUp);
  }

  /** Camera to hand to the next engine when the graph is rebuilt. */
  view(): GraphViewState {
    return { zoom: this.zoom, panX: this.panX, panY: this.panY, userMoved: this.userMoved };
  }

  /** "Ajustar": fits the graph and lets the camera follow the layout again. */
  fit(): void {
    this.userMoved = false;
    this.applyFit();
    this.schedule();
  }

  private applyFit() {
    const { w, h } = this.size();
    const t = fitTransform(this.opts.layout.bounds(), w, h);
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
    this.schedule();
  }

  /** Replays the layout from its initial spiral, with the camera following it ("Animar"). Pins hold. */
  replay(): void {
    const { layout } = this.opts;
    const pins = this.pins();
    layout.reset();
    pins.forEach((p, id) => {
      const i = this.opts.nodes.findIndex((n) => n.id === id);
      if (i > 0) layout.pin(i, p.x, p.y);
    });
    if (this.opts.reducedMotion()) layout.settle();
    this.userMoved = false;
    this.schedule();
  }

  /** Timelapse: only these nodes take part; newly active ones pop out of `near[i]` with their lines. */
  setActive(active: ArrayLike<number>, near: ArrayLike<number>): void {
    const { layout, edges } = this.opts;
    const now = performance.now();
    const born: number[] = [];
    for (let i = 0; i < layout.active.length; i++) {
      const next = active[i] ? 1 : 0;
      if (next && !layout.active[i]) born.push(i);
      layout.active[i] = next;
    }
    for (const i of born) {
      if (near[i] >= 0 && i !== 0 && !this.userPins.has(i)) layout.placeNear(i, near[i]);
      this.nodeBorn[i] = now;
    }
    const isBorn = new Set(born);
    for (let e = 0; e < edges.length; e++) {
      if (isBorn.has(edges[e].source) || isBorn.has(edges[e].target)) this.edgeBorn[e] = now;
    }
    if (this.opts.reducedMotion()) layout.settle();
    else if (born.length) layout.reheat(0.3);
    this.schedule();
  }

  setFocus(index: number | null): void {
    this.focus = index ?? -1;
    this.schedule();
  }

  setKeyboardFocus(index: number | null): void {
    this.keyboardFocus = index ?? -1;
    this.schedule();
  }

  setSearch(matches: ReadonlySet<number> | null): void {
    this.search = matches;
    this.schedule();
  }

  /** Nodes to ring softly (the timelapse's current step). */
  setFresh(nodes: ReadonlySet<number> | null): void {
    this.fresh = nodes;
    this.schedule();
  }

  /** Keeps an HTML element (e.g. a conversation balloon) next to a node. */
  setAnchor(el: HTMLElement | null, index: number): void {
    this.anchor = el ? { el, index } : null;
    this.schedule();
  }

  isPinned(index: number): boolean {
    return this.userPins.has(index);
  }

  pins(): PinMap {
    const { layout, nodes } = this.opts;
    const out: PinMap = new Map();
    this.userPins.forEach((i) => out.set(nodes[i].id, { x: layout.x[i], y: layout.y[i] }));
    return out;
  }

  togglePin(index: number): void {
    if (index <= 0) return;
    const { layout } = this.opts;
    if (this.userPins.has(index)) {
      this.userPins.delete(index);
      layout.unpin(index);
      layout.reheat(0.2);
    } else {
      this.userPins.add(index);
      layout.pin(index, layout.x[index], layout.y[index]);
    }
    this.opts.onPinsChange?.(this.pins());
    this.schedule();
  }

  /** "Soltar todos": every pinned node goes back to the physics. */
  unpinAll(): void {
    const { layout } = this.opts;
    this.userPins.forEach((i) => layout.unpin(i));
    this.userPins.clear();
    layout.reheat(0.4);
    this.opts.onPinsChange?.(this.pins());
    this.schedule();
  }

  /** True while/just after a drag, so clicks on overlays at the end of a gesture are ignored. */
  wasDragged(): boolean {
    return this.moved;
  }

  private schedule() {
    if (this.rafId === null) this.rafId = requestAnimationFrame(this.loop);
  }

  private size() {
    const { container } = this.opts;
    return { w: container.clientWidth || 360, h: container.clientHeight || 520 };
  }

  private center() {
    const { w, h } = this.size();
    return { cx: w / 2, cy: h / 2 - this.opts.centerOffsetY };
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

  private radiusOf = (i: number) => this.opts.nodes[i].radius * this.display.nodeSize;

  private nodeAt(clientX: number, clientY: number): number {
    const p = this.toGraph(clientX, clientY);
    const { layout } = this.opts;
    // A few screen px of slop makes small tag dots easy to hit with a finger.
    return hitTest(p.x, p.y, layout.x, layout.y, this.radiusOf, layout.active, 6 / this.zoom);
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
    if ((e.target as Element).closest("[data-graph-control]")) return;
    e.preventDefault();
    this.zoomAt(e.clientX, e.clientY, this.zoom * Math.exp(-e.deltaY * 0.0015));
  };

  private setHover(index: number) {
    if (index === this.hover) return;
    this.hover = index;
    this.opts.container.style.cursor = index >= 0 ? "pointer" : "";
    this.schedule();
  }

  private onHoverMove = (e: PointerEvent) => {
    if (e.pointerType === "touch" || this.mode !== "idle") return;
    if ((e.target as Element).closest("[data-graph-control]")) {
      this.setHover(-1);
      return;
    }
    this.setHover(this.nodeAt(e.clientX, e.clientY));
  };

  private onPointerLeave = () => {
    if (this.mode === "idle") this.setHover(-1);
  };

  private onPointerDown = (e: PointerEvent) => {
    if ((e.target as Element).closest("[data-graph-control]")) return;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.releaseDrag();
      this.mode = "pinch";
      this.pinchDist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      this.pinchZoom = this.zoom;
      this.moved = true;
      return;
    }
    const index = this.nodeAt(e.clientX, e.clientY);
    // The anchored center node pans instead of dragging.
    this.mode = index > 0 ? "node" : "pan";
    this.dragNode = index > 0 ? index : -1;
    this.downNode = index;
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
    if (!this.moved && Math.hypot(e.clientX - this.startX, e.clientY - this.startY) / scale > 4) {
      this.moved = true;
      this.opts.container.style.cursor = "grabbing";
      if (this.mode === "node") {
        this.opts.layout.alphaTarget = DRAG_ALPHA;
        this.opts.layout.reheat(DRAG_ALPHA);
      }
    }
    if (!this.moved) return;

    if (this.mode === "node" && this.dragNode > 0) {
      const p = this.toGraph(e.clientX, e.clientY);
      this.opts.layout.pin(this.dragNode, p.x, p.y);
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
    if (!this.moved && this.mode !== "pinch") this.click(this.downNode);
    this.releaseDrag();
    this.mode = "idle";
    this.opts.container.style.cursor = this.hover >= 0 ? "pointer" : "";
    window.setTimeout(() => (this.moved = false), 60);
  };

  private click(index: number) {
    if (index < 0) {
      this.opts.onBackgroundTap();
      return;
    }
    const now = performance.now();
    const double = this.lastClick.index === index && now - this.lastClick.time < DOUBLE_CLICK_MS;
    this.lastClick = { index: double ? -1 : index, time: now };
    if (double) this.togglePin(index);
    else this.opts.onNodeClick(index);
  }

  private releaseDrag() {
    const i = this.dragNode;
    const { layout } = this.opts;
    if (i > 0) {
      if (this.moved && this.display.pinOnDrag) {
        this.userPins.add(i);
        this.opts.onPinsChange?.(this.pins());
      } else if (this.userPins.has(i)) {
        if (this.moved) this.opts.onPinsChange?.(this.pins());
      } else layout.unpin(i);
    }
    layout.alphaTarget = 0;
    this.dragNode = -1;
    this.schedule();
  }

  private lit(): Neighborhood | null {
    const i = this.hover >= 0 ? this.hover : this.focus;
    if (i < 0 || !this.opts.layout.active[i]) return null;
    if (this.opts.neighborhood) return this.opts.neighborhood(i);
    const direct = new Set(this.opts.incident[i]);
    const nodes = new Set([i]);
    direct.forEach((e) => {
      nodes.add(this.opts.edges[e].source);
      nodes.add(this.opts.edges[e].target);
    });
    return { nodes, direct };
  }

  private loop = () => {
    this.rafId = null;
    const { layout, reducedMotion } = this.opts;
    let running = false;
    if (!layout.settled) {
      if (reducedMotion()) layout.settle();
      else {
        const deadline = performance.now() + TICK_BUDGET_MS;
        do layout.tick();
        while (layout.alpha > HOT_ALPHA && this.mode !== "node" && performance.now() < deadline);
        running = !layout.settled;
      }
    }
    // The camera follows the layout as it grows until the user takes over, and keeps easing until it catches up.
    let following = false;
    const { w, h } = this.size();
    if (!this.userMoved) {
      const t = fitTransform(layout.bounds(), w, h);
      const dz = t.zoom - this.zoom;
      const dx = t.panX - this.panX;
      const dy = t.panY - this.panY;
      following = Math.abs(dz) > 0.002 || Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5;
      const ease = reducedMotion() ? 1 : FOLLOW_EASE;
      this.zoom += dz * ease;
      this.panX += dx * ease;
      this.panY += dy * ease;
    }
    const animating = this.draw(w, h);
    this.placeAnchor();
    if (running || following || animating || this.mode === "node") this.schedule();
  };

  private placeAnchor() {
    if (!this.anchor) return;
    const { el, index } = this.anchor;
    const { layout } = this.opts;
    const { cx, cy } = this.center();
    const r = this.radiusOf(index) * this.zoom;
    const x = cx + this.panX + layout.x[index] * this.zoom + r * 0.55;
    const y = cy + this.panY + layout.y[index] * this.zoom - r - 22;
    el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  }

  /** Paints one frame; returns whether something is still animating (lines growing, nodes popping). */
  private draw(w: number, h: number): boolean {
    const ctx = this.ctx;
    const { canvas, edges, layout, edgeStyles, styleOf, nodes } = this.opts;
    if (!ctx) return false;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.sprites.beginFrame();
    this.labelSprites.beginFrame();
    const z = this.zoom;
    const { cx, cy } = this.center();
    const ox = cx + this.panX;
    const oy = cy + this.panY;
    const { x, y, active } = layout;
    const { linkWidth, arrows, nodeSize } = this.display;
    const now = performance.now();
    let animating = false;

    const lit = this.lit();
    const search = lit ? null : this.search;
    const searchEdges = search ? new Set([...search].flatMap((i) => this.opts.incident[i])) : null;
    const isDim = (i: number) => (lit ? !lit.nodes.has(i) : search ? !search.has(i) : false);
    // Only the focused node and its direct neighbours get forced labels; the rest follow the zoom.
    const labeled = new Set<number>();
    if (lit) {
      lit.direct.forEach((e) => {
        labeled.add(edges[e].source);
        labeled.add(edges[e].target);
      });
    }

    // Lines, in graph coordinates.
    ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * ox, dpr * oy);
    const growth = (i: number) => {
      const born = this.edgeBorn[i];
      if (!born) return 1;
      const g = edgeGrowth(now - born);
      if (g < 1) animating = true;
      return g;
    };
    const minX = -ox / z - 40;
    const maxX = (w - ox) / z + 40;
    const minY = -oy / z - 40;
    const maxY = (h - oy) / z + 40;
    // Zoomed far out, arrowheads are specks: skipping them keeps big graphs light.
    const showHeads = arrows && z >= ARROW_MIN_ZOOM;
    /** `devicePx`: line width on screen; 1 device px takes the rasterizer's fast hairline path. */
    const stroke = (
      pick: (i: number, e: E) => boolean,
      color: string,
      alpha: number,
      devicePx: number,
      dash: number[],
      withHeads = showHeads,
    ) => {
      ctx.beginPath();
      const heads: number[] = [];
      for (let i = 0; i < edges.length; i++) {
        const e = edges[i];
        const s = e.source;
        const t = e.target;
        if (!active[s] || !active[t] || !pick(i, e)) continue;
        if ((x[s] < minX && x[t] < minX) || (x[s] > maxX && x[t] > maxX)) continue;
        if ((y[s] < minY && y[t] < minY) || (y[s] > maxY && y[t] > maxY)) continue;
        const g = growth(i);
        ctx.moveTo(x[s], y[s]);
        ctx.lineTo(x[s] + (x[t] - x[s]) * g, y[s] + (y[t] - y[s]) * g);
        if (withHeads && g === 1) heads.push(i);
      }
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = devicePx / (dpr * z);
      ctx.setLineDash(dash.map((d) => d / z));
      ctx.stroke();
      if (!heads.length) return;
      // Small arrowheads that stop at the target's edge, constant on screen.
      ctx.beginPath();
      const size = (3 + 1.1 * linkWidth) / z;
      for (const i of heads) {
        const e = edges[i];
        const dx = x[e.target] - x[e.source];
        const dy = y[e.target] - y[e.source];
        const len = Math.hypot(dx, dy);
        const r = this.radiusOf(e.target) + 1.5 / z;
        if (len <= r + size * 3) continue;
        const ux = dx / len;
        const uy = dy / len;
        const tipX = x[e.target] - ux * r;
        const tipY = y[e.target] - uy * r;
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(tipX - ux * size * 1.7 - uy * size * 0.7, tipY - uy * size * 1.7 + ux * size * 0.7);
        ctx.lineTo(tipX - ux * size * 1.7 + uy * size * 0.7, tipY - uy * size * 1.7 - ux * size * 0.7);
        ctx.closePath();
      }
      ctx.fillStyle = color;
      ctx.fill();
    };
    // Default lines are exactly 1 device px (crisp, and the rasterizer's cheap hairline path); on dense
    // screens they get a little more opacity instead of more width.
    const base = linkWidth <= 1 ? 1 : linkWidth * Math.min(dpr, 1.5);
    const boost = linkWidth <= 1 && dpr >= 2 ? 1.5 : 1;
    const emphasized = lit?.direct ?? searchEdges;
    for (const [key, s] of Object.entries(edgeStyles)) {
      const rest = (i: number, e: E) => styleOf(e) === key && !emphasized?.has(i) && !lit?.shared?.has(i);
      stroke(rest, s.color, emphasized ? 0.06 : Math.min(1, s.alpha * boost), base, s.dash, showHeads && !emphasized);
      if (lit?.shared) stroke((i, e) => styleOf(e) === key && lit.shared!.has(i), s.color, 0.3 * boost, base, s.dash);
    }
    if (emphasized) {
      stroke((i) => emphasized.has(i), lit ? HIGHLIGHT : "#dec9a8", 0.95, 1.8 * linkWidth * dpr, [], arrows);
    }
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);

    // Nodes and labels, in device pixels, so bitmaps and text are rasterized at their final size.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const margin = 60;
    const labels: { i: number; sx: number; sy: number; r: number; alpha: number }[] = [];
    const baseLabelAlpha = labelOpacity(z, this.display.labelZoom);
    for (let i = 0; i < nodes.length; i++) {
      if (!active[i]) continue;
      const node = nodes[i];
      let pop = 1;
      if (this.nodeBorn[i]) {
        pop = popScale(now - this.nodeBorn[i]);
        if (pop !== 1) animating = true;
      }
      const sx = ox + x[i] * z;
      const sy = oy + y[i] * z;
      const r = node.radius * nodeSize * z * Math.max(0, pop);
      if (sx < -margin - r || sx > w + margin + r || sy < -margin - r || sy > h + margin + r) continue;
      const dim = isDim(i);
      ctx.globalAlpha = dim ? 0.16 : 1;
      this.drawNode(ctx, node, i, sx * dpr, sy * dpr, r * dpr, dpr);
      const isLit = labeled.has(i) || Boolean(search?.has(i));
      const alpha = node.alwaysLabel || isLit || this.fresh?.has(i) ? 1 : baseLabelAlpha;
      if (alpha > 0.02 && r > 2.5) labels.push({ i, sx, sy, r, alpha: dim ? alpha * 0.2 : alpha });
    }

    const fontDevicePx = LABEL_FONT_PX * Math.min(1.35, Math.max(0.85, z * Math.sqrt(nodeSize))) * dpr;
    for (const l of labels) {
      const node = nodes[l.i];
      const ringPx = node.ring && node.ringWidth ? l.r * (node.ringWidth / node.radius) : 0;
      const sprite = this.labelSprites.get(node.label, node.labelColor ?? "#f5f0e7", fontDevicePx);
      if (!sprite) continue;
      ctx.globalAlpha = l.alpha;
      // A fallback sprite of another size (creation budget spent this frame) is scaled to fit.
      const k = labelSize(fontDevicePx) / sprite.size;
      const sw = sprite.width * k;
      ctx.drawImage(
        sprite.canvas,
        Math.round(l.sx * dpr - sw / 2),
        Math.round((l.sy + l.r + ringPx) * dpr),
        sw,
        sprite.height * k,
      );
    }
    ctx.globalAlpha = 1;
    // Some bitmaps were stand-ins of another size (creation budget spent): keep drawing until all are exact.
    return animating || this.sprites.pending || this.labelSprites.pending;
  }

  private drawNode(
    ctx: CanvasRenderingContext2D,
    node: VisualNode,
    i: number,
    x: number,
    y: number,
    r: number,
    dpr: number,
  ) {
    const TAU = Math.PI * 2;
    const highlighted = i === this.hover || i === this.focus;
    const ringRatio = node.ring && node.ringWidth ? node.ringWidth / node.radius : 0;
    const ringW = r * ringRatio;
    const outer = r + ringW;
    // Halo for the hovered / focused node, and a soft one for the timelapse's newest nodes.
    if (highlighted || this.fresh?.has(i)) {
      ctx.beginPath();
      ctx.arc(x, y, outer + 5 * dpr, 0, TAU);
      ctx.fillStyle = highlighted ? "rgba(167, 139, 250, 0.38)" : "rgba(222, 201, 168, 0.3)";
      ctx.fill();
    }
    const sprite =
      node.kind === "avatar" && node.avatar ? this.sprites.get(node.avatar, 2 * outer, node.ring, ringRatio) : null;
    if (sprite) ctx.drawImage(sprite, x - outer, y - outer, 2 * outer, 2 * outer);
    else {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fillStyle = node.kind === "avatar" ? "#313d49" : (node.fill ?? "#ded6ca");
      ctx.fill();
      if (node.kind === "dot" && !node.ring && r > 3 * dpr) {
        ctx.lineWidth = Math.max(1, 1.2 * dpr);
        ctx.strokeStyle = "rgba(28, 38, 49, 0.7)";
        ctx.stroke();
      }
      if (node.glyph && r > 5 * dpr) {
        ctx.font = `700 ${(r * 0.95).toFixed(1)}px ${this.font}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#f5f0e7";
        ctx.fillText(node.glyph, x, y + r * 0.06);
      }
      if (node.ring && ringW > 0) {
        ctx.beginPath();
        ctx.arc(x, y, r + ringW / 2, 0, TAU);
        ctx.lineWidth = ringW;
        ctx.strokeStyle = node.ring;
        ctx.stroke();
      }
    }
    if (i === this.keyboardFocus) {
      ctx.beginPath();
      ctx.arc(x, y, outer + 4 * dpr, 0, TAU);
      ctx.lineWidth = 2.5 * dpr;
      ctx.strokeStyle = "#f5f0e7";
      ctx.stroke();
    }
    if (this.userPins.has(i) && r > 4 * dpr) {
      // Pin head on the upper right: this node stays where the user left it.
      const pr = Math.max(4.5 * dpr, r * 0.28);
      const px = x + outer * 0.72;
      const py = y - outer * 0.72;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, TAU);
      ctx.fillStyle = "#dec9a8";
      ctx.fill();
      ctx.lineWidth = 1.5 * dpr;
      ctx.strokeStyle = "#1c2631";
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(px, py, pr * 0.38, 0, TAU);
      ctx.fillStyle = "#1c2631";
      ctx.fill();
    }
  }
}
