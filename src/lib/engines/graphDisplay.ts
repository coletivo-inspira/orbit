import type { LayoutForces } from "./forceLayout";
import type { GraphViewDisplay } from "./graphView";

/** Obsidian-style display panel ("Tela" and "Forças") shared by the graph views. */
export interface GraphDisplay {
  arrows: boolean;
  /** Dragged nodes stay where they are dropped (Obsidian-like manual arrangement). */
  pinOnDrag: boolean;
  /** -1 shows labels even zoomed out; +1 only close up. */
  textFade: number;
  nodeSize: number;
  linkWidth: number;
  center: number;
  repel: number;
  link: number;
  distance: number;
}

type NumericKey = Exclude<keyof GraphDisplay, "arrows" | "pinOnDrag">;

export const GRAPH_DISPLAY_LIMITS: Record<NumericKey, { min: number; max: number; step: number }> = {
  textFade: { min: -1, max: 1, step: 0.05 },
  nodeSize: { min: 0.6, max: 1.8, step: 0.05 },
  linkWidth: { min: 0.4, max: 3, step: 0.1 },
  center: { min: 0, max: 3, step: 0.05 },
  repel: { min: 0.2, max: 3, step: 0.05 },
  link: { min: 0.1, max: 2, step: 0.05 },
  distance: { min: 0.5, max: 3, step: 0.05 },
};

export const DEFAULT_GRAPH_DISPLAY: GraphDisplay = {
  arrows: true,
  pinOnDrag: true,
  textFade: 0,
  nodeSize: 1,
  linkWidth: 1,
  center: 1,
  repel: 1,
  link: 1,
  distance: 1,
};

const BASE_LABEL_ZOOM = 0.8;

export function labelZoomFor(textFade: number): number {
  return BASE_LABEL_ZOOM * Math.pow(2, textFade * 1.3);
}

export function viewDisplayOf(d: GraphDisplay): GraphViewDisplay {
  return {
    linkWidth: d.linkWidth,
    arrows: d.arrows,
    labelZoom: labelZoomFor(d.textFade),
    nodeSize: d.nodeSize,
    pinOnDrag: d.pinOnDrag,
  };
}

export function forcesOf(d: GraphDisplay): LayoutForces {
  return { center: d.center, repel: d.repel, link: d.link, distance: d.distance };
}

function clamp(value: number, key: NumericKey): number {
  const { min, max } = GRAPH_DISPLAY_LIMITS[key];
  return Math.min(max, Math.max(min, value));
}

/** Restores settings from storage; unknown or out-of-range values fall back to the defaults. */
export function sanitizeGraphDisplay(raw: unknown): GraphDisplay {
  const out = { ...DEFAULT_GRAPH_DISPLAY };
  if (typeof raw !== "object" || raw === null) return out;
  const data = raw as Record<string, unknown>;
  if (typeof data.arrows === "boolean") out.arrows = data.arrows;
  if (typeof data.pinOnDrag === "boolean") out.pinOnDrag = data.pinOnDrag;
  for (const key of Object.keys(GRAPH_DISPLAY_LIMITS) as NumericKey[]) {
    const v = data[key];
    if (typeof v === "number" && Number.isFinite(v)) out[key] = clamp(v, key);
  }
  return out;
}

const MAX_PINS = 1000;

/** Pinned positions restored from storage: `{ id: [x, y] }`, finite numbers only, capped. */
export function sanitizePins(raw: unknown): Map<string, { x: number; y: number }> {
  const out = new Map<string, { x: number; y: number }>();
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return out;
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (out.size >= MAX_PINS) break;
    if (!Array.isArray(value) || value.length !== 2) continue;
    const [x, y] = value;
    if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (Math.abs(x) > 1e5 || Math.abs(y) > 1e5) continue;
    out.set(id.slice(0, 80), { x, y });
  }
  return out;
}

export function serializePins(pins: ReadonlyMap<string, { x: number; y: number }>): Record<string, [number, number]> {
  const out: Record<string, [number, number]> = {};
  pins.forEach((p, id) => (out[id] = [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10]));
  return out;
}
