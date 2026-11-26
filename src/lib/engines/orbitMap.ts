import { layoutZoom } from "@/lib/engines/mapLayout";
import { fromMercator, metersPerPixel, worldSize, type MercatorPoint } from "@/lib/geo/mercator";

export interface MapNode {
  el: HTMLElement;
  /** Stable across re-renders, so a bubble nudged to a new spot glides there instead of jumping. */
  key: string;
  /** Marker position (anchor plus nudge) in Mercator space. */
  point: MercatorPoint;
  scale: number;
  balloonEl?: HTMLElement | null;
  /** Item index in the current layout, used by keyboard reveal. */
  index: number;
}

export interface MapView {
  /** Zoom step of the layout to show. */
  zoom: number;
  /** Middle of the field in world px at `zoom`, snapped to a grid so React re-renders only on real moves. */
  x: number;
  y: number;
  halfW: number;
  halfH: number;
}

export interface MapCamera {
  /** Mercator point at the visual center of the field. */
  x: number;
  y: number;
  zoom: number;
}

interface MapEngineOptions {
  container: HTMLElement;
  youEl: HTMLElement;
  origin: MercatorPoint;
  /** Zoom that frames the nearest people for a field of this size. */
  homeZoom: (width: number, height: number) => number;
  minZoom: number;
  maxZoom: number;
  /** How far (Mercator units) the camera may wander from "Você". */
  maxDistance: number;
  /** Vertical offset of the visual center (mobile shifts up to clear the floating nav). */
  centerOffsetY: number;
  getScale: () => number;
  reducedMotion: () => boolean;
  onViewChange: (view: MapView) => void;
  /** Camera of the map canvas: Mercator point at the container's own center. */
  onCamera?: (center: MercatorPoint, zoom: number) => void;
  /** Offline street pattern shown until (or instead of) the real map; follows the pan and zoom. */
  backdropEl?: HTMLElement | null;
  backdropTile?: number;
  /** Distance rings around "Você": children with `data-m` (meters) get their radius set every frame. */
  ringsEl?: SVGGElement | null;
  /** Balloons show on bubbles this close to the visual center (px), or on every bubble from `balloonZoom` on. */
  nearRadius: number;
  balloonZoom: number;
  nodes: MapNode[];
}

export const VIEW_CELL = 160;
const VIEW_MARGIN = 220;
const REST_SPEED = 0.05;
const TWEEN_MS = 420;

export function mapViewFor(camera: MapCamera, width: number, height: number): MapView {
  const zoom = layoutZoom(camera.zoom);
  const size = worldSize(zoom);
  const snap = (v: number) => Math.round(v / VIEW_CELL) * VIEW_CELL;
  return {
    zoom,
    x: snap(camera.x * size),
    y: snap(camera.y * size),
    halfW: Math.ceil(width / 2 + VIEW_MARGIN),
    halfH: Math.ceil(height / 2 + VIEW_MARGIN),
  };
}

/** Keeps the camera within `maxDistance` of the origin (Mercator units). */
export function clampCamera(camera: MapCamera, origin: MercatorPoint, maxDistance: number): MapCamera {
  const dx = camera.x - origin.x;
  const dy = camera.y - origin.y;
  const d = Math.hypot(dx, dy);
  if (d <= maxDistance) return camera;
  return { ...camera, x: origin.x + (dx / d) * maxDistance, y: origin.y + (dy / d) * maxDistance };
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

interface Tween {
  from: MapCamera;
  to: MapCamera;
  start: number;
}

/**
 * Pan/zoom camera over a Web Mercator map. Owns only transforms/opacity of elements React rendered;
 * React keeps the markup. Frames are only scheduled while something moves, so an idle map costs nothing.
 */
export class OrbitMapEngine {
  private cam: MapCamera;
  private velX = 0;
  private velY = 0;
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private pinchDist = 0;
  private moved = false;
  private tween: Tween | null = null;
  private rafId: number | null = null;
  private movedResetTimer: number | null = null;
  private readonly resizeObserver: ResizeObserver;
  private nodes: MapNode[];
  private readonly current = new Map<string, { x: number; y: number; s: number }>();
  private lastView: MapView | null = null;
  private origin: MercatorPoint;
  private originLat: number;
  private maxDistance: number;
  private readonly rings: { el: SVGElement; meters: number; label: boolean }[];

  constructor(private readonly opts: MapEngineOptions) {
    this.nodes = opts.nodes;
    this.origin = opts.origin;
    this.originLat = fromMercator(opts.origin).lat;
    this.maxDistance = opts.maxDistance;
    this.rings = [...(opts.ringsEl?.querySelectorAll<SVGElement>("[data-m]") ?? [])].map((el) => ({
      el,
      meters: Number(el.dataset.m),
      label: el.tagName.toLowerCase() === "text",
    }));
    const { w, h } = this.size();
    this.cam = { x: opts.origin.x, y: opts.origin.y, zoom: this.clampZoom(opts.homeZoom(w, h)) };
    opts.container.addEventListener("pointerdown", this.onPointerDown);
    opts.container.addEventListener("wheel", this.onWheel, { passive: false });
    opts.container.addEventListener("dblclick", this.onDoubleClick);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("pointercancel", this.onPointerUp);
    this.resizeObserver = new ResizeObserver(() => this.schedule());
    this.resizeObserver.observe(opts.container);
    this.loop();
  }

  camera(): MapCamera {
    return { ...this.cam };
  }

  /** Swaps the rendered markers without moving the camera, and places them before paint. */
  setNodes(nodes: MapNode[]): void {
    this.nodes = nodes;
    const keys = new Set(nodes.map((n) => n.key));
    for (const k of this.current.keys()) if (!keys.has(k)) this.current.delete(k);
    this.frameNow();
  }

  /** New "Você" (e.g. the device location arrived): jump there at the home zoom. */
  setOrigin(origin: MercatorPoint, maxDistance: number): void {
    const moved = origin.x !== this.origin.x || origin.y !== this.origin.y;
    this.origin = origin;
    this.originLat = fromMercator(origin).lat;
    this.maxDistance = maxDistance;
    if (moved) {
      const { w, h } = this.size();
      this.current.clear();
      this.stop();
      this.cam = { x: origin.x, y: origin.y, zoom: this.clampZoom(this.opts.homeZoom(w, h)) };
    }
    this.frameNow();
  }

  /** True while/just after a drag, so marker clicks at the end of a pan are ignored. */
  wasDragged(): boolean {
    return this.moved;
  }

  recenter(): void {
    const { w, h } = this.size();
    this.flyTo({ x: this.origin.x, y: this.origin.y, zoom: this.clampZoom(this.opts.homeZoom(w, h)) });
  }

  zoomBy(delta: number): void {
    this.flyTo({ ...this.cam, zoom: this.clampZoom(this.cam.zoom + delta) });
  }

  flyTo(target: MapCamera): void {
    const to = clampCamera({ ...target, zoom: this.clampZoom(target.zoom) }, this.origin, this.maxDistance);
    this.velX = 0;
    this.velY = 0;
    if (this.opts.reducedMotion()) {
      this.tween = null;
      this.cam = to;
      this.frameNow();
      return;
    }
    this.tween = { from: { ...this.cam }, to, start: performance.now() };
    this.schedule();
  }

  /** Keeps a keyboard-focused marker comfortably inside the visible field. */
  reveal(index: number): void {
    const node = this.nodes.find((n) => n.index === index);
    if (!node) return;
    this.opts.container.scrollTop = 0;
    this.opts.container.scrollLeft = 0;
    const { w, h } = this.size();
    const { sx, sy } = this.toScreen(node.point, w, h);
    const margin = 72;
    if (sx > margin && sx < w - margin && sy > margin && sy < h - margin - 90) return;
    this.stop();
    this.cam = clampCamera({ ...this.cam, x: node.point.x, y: node.point.y }, this.origin, this.maxDistance);
    this.frameNow();
  }

  /** Whether a frame is pending; exposed for tests and profiling. */
  isAnimating(): boolean {
    return this.rafId !== null;
  }

  destroy(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    if (this.movedResetTimer !== null) window.clearTimeout(this.movedResetTimer);
    this.resizeObserver.disconnect();
    const { container } = this.opts;
    container.removeEventListener("pointerdown", this.onPointerDown);
    container.removeEventListener("wheel", this.onWheel);
    container.removeEventListener("dblclick", this.onDoubleClick);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("pointercancel", this.onPointerUp);
  }

  private size() {
    const { container } = this.opts;
    return { w: container.clientWidth || 360, h: container.clientHeight || 520 };
  }

  private clampZoom(z: number) {
    return Math.max(this.opts.minZoom, Math.min(this.opts.maxZoom, z));
  }

  private stop() {
    this.tween = null;
    this.velX = 0;
    this.velY = 0;
  }

  private schedule() {
    if (this.rafId === null) this.rafId = requestAnimationFrame(this.loop);
  }

  private frameNow() {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.loop();
  }

  private toScreen(p: MercatorPoint, w: number, h: number) {
    const size = worldSize(this.cam.zoom);
    return {
      sx: w / 2 + (p.x - this.cam.x) * size,
      sy: h / 2 - this.opts.centerOffsetY + (p.y - this.cam.y) * size,
    };
  }

  /** Field coordinates (unscaled CSS px) of a pointer, correct inside the studio's scaled frames. */
  private fieldPoint(clientX: number, clientY: number) {
    const rect = this.opts.container.getBoundingClientRect();
    const scale = this.opts.getScale() || 1;
    return { px: (clientX - rect.left) / scale, py: (clientY - rect.top) / scale };
  }

  /** Changes the zoom keeping the map point under (px, py) where it is. */
  private zoomAround(px: number, py: number, zoom: number) {
    const { w, h } = this.size();
    const next = this.clampZoom(zoom);
    const ox = px - w / 2;
    const oy = py - (h / 2 - this.opts.centerOffsetY);
    const before = worldSize(this.cam.zoom);
    const after = worldSize(next);
    const mx = this.cam.x + ox / before;
    const my = this.cam.y + oy / before;
    this.cam = clampCamera({ x: mx - ox / after, y: my - oy / after, zoom: next }, this.origin, this.maxDistance);
  }

  private panBy(dx: number, dy: number) {
    const size = worldSize(this.cam.zoom);
    this.cam = clampCamera(
      { ...this.cam, x: this.cam.x - dx / size, y: this.cam.y - dy / size },
      this.origin,
      this.maxDistance,
    );
  }

  private pinchState() {
    const [a, b] = [...this.pointers.values()];
    return { dist: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
  }

  private onPointerDown = (e: PointerEvent) => {
    if ((e.target as HTMLElement | null)?.closest("[data-map-control]")) return;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.tween = null;
    this.velX = 0;
    this.velY = 0;
    if (this.pointers.size === 1) this.moved = false;
    if (this.pointers.size === 2) this.pinchDist = this.pinchState().dist;
    this.schedule();
  };

  private onPointerMove = (e: PointerEvent) => {
    const last = this.pointers.get(e.pointerId);
    if (!last) return;
    const scale = this.opts.getScale() || 1;
    if (this.pointers.size >= 2) {
      const before = this.pinchState();
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const after = this.pinchState();
      this.moved = true;
      this.panBy((after.mx - before.mx) / scale, (after.my - before.my) / scale);
      if (this.pinchDist > 0 && after.dist > 0) {
        const { px, py } = this.fieldPoint(after.mx, after.my);
        this.zoomAround(px, py, this.cam.zoom + Math.log2(after.dist / this.pinchDist));
      }
      this.pinchDist = after.dist;
      this.velX = 0;
      this.velY = 0;
      this.schedule();
      return;
    }
    const dx = (e.clientX - last.x) / scale;
    const dy = (e.clientY - last.y) / scale;
    if (Math.hypot(dx, dy) > 2.5) this.moved = true;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.panBy(dx, dy);
    this.velX = dx * 0.7;
    this.velY = dy * 0.7;
    this.schedule();
  };

  private onPointerUp = (e: PointerEvent) => {
    if (!this.pointers.delete(e.pointerId)) return;
    if (this.pointers.size === 1) {
      // Pinch ended with one finger still down: keep panning from it without a jump.
      this.velX = 0;
      this.velY = 0;
      return;
    }
    if (this.pointers.size > 0) return;
    if (this.opts.reducedMotion()) {
      this.velX = 0;
      this.velY = 0;
    }
    this.schedule();
    if (this.movedResetTimer !== null) window.clearTimeout(this.movedResetTimer);
    this.movedResetTimer = window.setTimeout(() => {
      this.moved = false;
    }, 60);
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const step = e.deltaMode === 1 ? 0.05 : e.deltaMode === 2 ? 1 : 0.0022;
    const delta = Math.max(-1, Math.min(1, -e.deltaY * step));
    const { px, py } = this.fieldPoint(e.clientX, e.clientY);
    this.stop();
    this.zoomAround(px, py, this.cam.zoom + delta);
    this.schedule();
  };

  private onDoubleClick = (e: MouseEvent) => {
    if ((e.target as HTMLElement | null)?.closest("button, a, [data-map-control]")) return;
    const { px, py } = this.fieldPoint(e.clientX, e.clientY);
    const { w, h } = this.size();
    const size = worldSize(this.cam.zoom);
    const x = this.cam.x + (px - w / 2) / size;
    const y = this.cam.y + (py - (h / 2 - this.opts.centerOffsetY)) / size;
    this.flyTo({ x, y, zoom: this.cam.zoom + 1 });
  };

  private loop = () => {
    this.rafId = null;
    const { w, h } = this.size();
    const reduced = this.opts.reducedMotion();
    let busy = this.pointers.size > 0;

    if (this.tween) {
      const t = Math.min(1, (performance.now() - this.tween.start) / TWEEN_MS);
      const k = easeOut(t);
      const { from, to } = this.tween;
      this.cam = {
        x: from.x + (to.x - from.x) * k,
        y: from.y + (to.y - from.y) * k,
        zoom: from.zoom + (to.zoom - from.zoom) * k,
      };
      if (t < 1) busy = true;
      else this.tween = null;
    } else if (this.pointers.size === 0 && (this.velX || this.velY)) {
      this.panBy(this.velX, this.velY);
      this.velX *= 0.9;
      this.velY *= 0.9;
      if (Math.abs(this.velX) < REST_SPEED && Math.abs(this.velY) < REST_SPEED) {
        this.velX = 0;
        this.velY = 0;
      } else {
        busy = true;
      }
    }

    const size = worldSize(this.cam.zoom);
    // "Você" stays at the visual center while the camera walks the map, like the watch honeycomb.
    const you = { sx: w / 2, sy: h / 2 - this.opts.centerOffsetY };
    const originScreen = this.toScreen(this.origin, w, h);
    this.opts.youEl.style.transform = `translate3d(${you.sx.toFixed(1)}px, ${you.sy.toFixed(1)}px, 0) translate(-50%, -50%)`;
    const backdrop = this.opts.backdropEl;
    if (backdrop) {
      const tile = (this.opts.backdropTile ?? 1200) * Math.pow(2, this.cam.zoom - 14);
      backdrop.style.backgroundPosition = `${originScreen.sx.toFixed(1)}px ${originScreen.sy.toFixed(1)}px`;
      backdrop.style.backgroundSize = `${tile.toFixed(1)}px ${tile.toFixed(1)}px`;
    }

    if (this.opts.ringsEl) {
      this.opts.ringsEl.setAttribute("transform", `translate(${you.sx.toFixed(1)} ${you.sy.toFixed(1)})`);
      const mpp = metersPerPixel(this.originLat, this.cam.zoom);
      const fit = Math.hypot(w, h);
      for (const ring of this.rings) {
        const r = ring.meters / mpp;
        // A ring is only useful between "just around Você" and "bigger than the screen".
        const show = r > 70 && r < fit;
        if (ring.label) ring.el.setAttribute("y", (-r - 5).toFixed(1));
        else ring.el.setAttribute("r", r.toFixed(1));
        ring.el.style.display = show ? "" : "none";
      }
    }

    const view = mapViewFor(this.cam, w, h);
    const last = this.lastView;
    if (
      !last ||
      last.zoom !== view.zoom ||
      last.x !== view.x ||
      last.y !== view.y ||
      last.halfW !== view.halfW ||
      last.halfH !== view.halfH
    ) {
      this.lastView = view;
      this.opts.onViewChange(view);
    }

    const near2 = this.opts.nearRadius * this.opts.nearRadius;
    const allBalloons = this.cam.zoom >= this.opts.balloonZoom;
    for (const n of this.nodes) {
      let cur = this.current.get(n.key);
      if (!cur) {
        cur = { x: n.point.x, y: n.point.y, s: n.scale };
        this.current.set(n.key, cur);
      } else if (reduced) {
        cur.x = n.point.x;
        cur.y = n.point.y;
        cur.s = n.scale;
      } else {
        // Nudges change between zoom steps: glide to the new spot instead of jumping.
        const ex = (n.point.x - cur.x) * size;
        const ey = (n.point.y - cur.y) * size;
        if (Math.abs(ex) > 0.3 || Math.abs(ey) > 0.3 || Math.abs(n.scale - cur.s) > 0.002) {
          cur.x += (n.point.x - cur.x) * 0.28;
          cur.y += (n.point.y - cur.y) * 0.28;
          cur.s += (n.scale - cur.s) * 0.28;
          busy = true;
        } else {
          cur.x = n.point.x;
          cur.y = n.point.y;
          cur.s = n.scale;
        }
      }
      const sx = w / 2 + (cur.x - this.cam.x) * size;
      const sy = h / 2 - this.opts.centerOffsetY + (cur.y - this.cam.y) * size;
      n.el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) scale(${cur.s.toFixed(3)})`;
      if (n.el.style.opacity !== "1") n.el.style.opacity = "1";
      if (n.balloonEl) {
        const near = String(allBalloons || (sx - you.sx) ** 2 + (sy - you.sy) ** 2 <= near2);
        if (n.balloonEl.dataset.near !== near) n.balloonEl.dataset.near = near;
      }
    }

    this.opts.onCamera?.({ x: this.cam.x, y: this.cam.y + this.opts.centerOffsetY / size }, this.cam.zoom);
    if (busy) this.schedule();
  };
}
