/** Any graph the layout can place: nodes only need a stable id; `kind` picks the default charge. */
export interface LayoutGraph {
  nodes: readonly { id: string; kind?: string }[];
  edges: readonly { source: number; target: number }[];
}

/** Multipliers over the default forces (1 = default), set from the graph display panel. */
export interface LayoutForces {
  center: number;
  repel: number;
  link: number;
  distance: number;
}

export const DEFAULT_FORCES: LayoutForces = { center: 1, repel: 1, link: 1, distance: 1 };

export interface LayoutOptions {
  /** Repulsion per node (negative pushes away). Defaults to people/hub charges of the interest graph. */
  charge?: (index: number, degree: number) => number;
  /** Collision radius per node, in graph px, before `radiusScale`. */
  radius?: (index: number) => number;
  /** Positions from a previous layout of a similar graph, by node id: warm start instead of a full restart. */
  initial?: ReadonlyMap<string, { x: number; y: number }>;
  forces?: LayoutForces;
}

const ALPHA_MIN = 0.002;
const ALPHA_DECAY = 1 - Math.pow(ALPHA_MIN, 1 / 300);
const VELOCITY_DECAY = 0.6;
const LINK_DISTANCE = 64;
const GRAVITY = 0.03;
const COLLIDE_PADDING = 4;
const REPULSION_CUTOFF = 380;
/** Warm starts begin cooler, so a filter change nudges the graph instead of exploding it. */
const WARM_ALPHA = 0.35;
const NEIGHBOR_OFFSETS: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

function defaultCharge(kind: string | undefined, degree: number): number {
  return kind === "person" || kind === "me" ? -260 : -180 - Math.min(degree, 12) * 12;
}

/**
 * Deterministic force layout (d3-force style: many-body repulsion, springs, gravity, collision).
 * Starts from a phyllotaxis spiral, so the same graph always settles the same way.
 * Node 0 is anchored at the center.
 */
export class ForceLayout {
  readonly x: Float64Array;
  readonly y: Float64Array;
  private readonly vx: Float64Array;
  private readonly vy: Float64Array;
  private readonly pinned: Uint8Array;
  private readonly charge: Float64Array;
  private readonly baseRadius: Float64Array;
  private readonly degree: Uint16Array;
  /** Nodes taking part in the simulation; inactive ones are frozen and ignored (timelapse). */
  readonly active: Uint8Array;
  alpha = 1;
  forces: LayoutForces;
  radiusScale = 1;

  constructor(
    private readonly graph: LayoutGraph,
    options: LayoutOptions = {},
  ) {
    const n = graph.nodes.length;
    this.x = new Float64Array(n);
    this.y = new Float64Array(n);
    this.vx = new Float64Array(n);
    this.vy = new Float64Array(n);
    this.pinned = new Uint8Array(n);
    this.charge = new Float64Array(n);
    this.baseRadius = new Float64Array(n);
    this.degree = new Uint16Array(n);
    this.active = new Uint8Array(n).fill(1);
    this.forces = { ...(options.forces ?? DEFAULT_FORCES) };
    graph.edges.forEach((e) => {
      this.degree[e.source]++;
      this.degree[e.target]++;
    });
    graph.nodes.forEach((node, i) => {
      this.charge[i] = options.charge?.(i, this.degree[i]) ?? defaultCharge(node.kind, this.degree[i]);
      this.baseRadius[i] = options.radius?.(i) ?? 0;
    });
    this.spiral();
    if (options.initial?.size) this.warmStart(options.initial);
    this.pinned[0] = 1;
  }

  private spiral() {
    for (let i = 0; i < this.x.length; i++) {
      const r = 14 * Math.sqrt(0.5 + i);
      this.x[i] = i === 0 ? 0 : r * Math.cos(i * GOLDEN);
      this.y[i] = i === 0 ? 0 : r * Math.sin(i * GOLDEN);
    }
  }

  private warmStart(initial: ReadonlyMap<string, { x: number; y: number }>) {
    const { nodes, edges } = this.graph;
    const known = new Uint8Array(nodes.length);
    let hits = 0;
    nodes.forEach((node, i) => {
      const p = initial.get(node.id);
      if (!p || i === 0) return;
      this.x[i] = p.x;
      this.y[i] = p.y;
      known[i] = 1;
      hits++;
    });
    // New nodes appear next to a node they link to, so they slide in instead of flying across.
    for (const e of edges) {
      for (const [a, b] of [
        [e.source, e.target],
        [e.target, e.source],
      ]) {
        if (known[a] || !known[b] || a === 0) continue;
        this.placeNear(a, b);
        known[a] = 1;
      }
    }
    if (hits >= nodes.length / 2) this.alpha = WARM_ALPHA;
  }

  /** Puts node `i` a short, deterministic hop away from node `near`. */
  placeNear(i: number, near: number): void {
    const angle = i * GOLDEN;
    const hop = 18 + (i % 5) * 4;
    this.x[i] = this.x[near] + Math.cos(angle) * hop;
    this.y[i] = this.y[near] + Math.sin(angle) * hop;
    this.vx[i] = 0;
    this.vy[i] = 0;
  }

  /** Back to the initial spiral, fully hot: replays the layout from scratch ("Animar"). */
  reset(): void {
    this.spiral();
    this.vx.fill(0);
    this.vy.fill(0);
    this.alpha = 1;
  }

  /** Positions by node id, to warm start the next layout of a similar graph. */
  positions(): Map<string, { x: number; y: number }> {
    const out = new Map<string, { x: number; y: number }>();
    this.graph.nodes.forEach((node, i) => out.set(node.id, { x: this.x[i], y: this.y[i] }));
    return out;
  }

  get settled(): boolean {
    return this.alpha < ALPHA_MIN;
  }

  reheat(alpha = 0.3): void {
    this.alpha = Math.max(this.alpha, alpha);
  }

  pin(i: number, x: number, y: number): void {
    this.pinned[i] = 1;
    this.x[i] = x;
    this.y[i] = y;
    this.vx[i] = 0;
    this.vy[i] = 0;
  }

  /** The user's own node stays anchored at the center. */
  unpin(i: number): void {
    if (i !== 0) this.pinned[i] = 0;
  }

  radiusOf(i: number): number {
    return this.baseRadius[i] * this.radiusScale;
  }

  tick(): void {
    const { x, y, vx, vy, pinned, charge, degree, active, forces } = this;
    const n = x.length;
    const alpha = this.alpha;
    const repelK = forces.repel;
    const scale = this.radiusScale;
    const radius = this.baseRadius;

    const repel = (i: number, j: number) => {
      let dx = x[j] - x[i];
      let dy = y[j] - y[i];
      let d2 = dx * dx + dy * dy;
      if (d2 > REPULSION_CUTOFF * REPULSION_CUTOFF) return;
      if (d2 < 1) {
        dx = ((i * 7 + j * 13) % 11) / 11 - 0.5 || 0.3;
        dy = ((i * 5 + j * 3) % 7) / 7 - 0.5 || -0.3;
        d2 = dx * dx + dy * dy;
      }
      vx[i] += (dx * charge[j] * repelK * alpha) / d2;
      vy[i] += (dy * charge[j] * repelK * alpha) / d2;
      vx[j] -= (dx * charge[i] * repelK * alpha) / d2;
      vy[j] -= (dy * charge[i] * repelK * alpha) / d2;
      // Collision: avatars are big, so repulsion alone lets them pile on top of each other.
      const min = (radius[i] + radius[j]) * scale + COLLIDE_PADDING;
      if (min > COLLIDE_PADDING && d2 < min * min) {
        const d = Math.sqrt(d2);
        const push = ((min - d) / d) * 0.35;
        const share = pinned[i] ? 0 : pinned[j] ? 1 : 0.5;
        vx[i] -= dx * push * share;
        vy[i] -= dy * push * share;
        vx[j] += dx * push * (1 - share);
        vy[j] += dy * push * (1 - share);
      }
    };

    // Uniform grid with cutoff-sized cells: each pair is checked once, against its own and 4 neighbor cells.
    const cells = new Map<number, number[]>();
    const key = (cx: number, cy: number) => cx * 73856093 + cy;
    for (let i = 0; i < n; i++) {
      if (!active[i]) continue;
      const k = key(Math.floor(x[i] / REPULSION_CUTOFF), Math.floor(y[i] / REPULSION_CUTOFF));
      const cell = cells.get(k);
      if (cell) cell.push(i);
      else cells.set(k, [i]);
    }
    for (const members of cells.values()) {
      const cx = Math.floor(x[members[0]] / REPULSION_CUTOFF);
      const cy = Math.floor(y[members[0]] / REPULSION_CUTOFF);
      for (let a = 0; a < members.length; a++) {
        for (let b = a + 1; b < members.length; b++) repel(members[a], members[b]);
      }
      for (const [ox, oy] of NEIGHBOR_OFFSETS) {
        const other = cells.get(key(cx + ox, cy + oy));
        if (!other) continue;
        for (const i of members) for (const j of other) repel(i, j);
      }
    }

    const linkDistance = LINK_DISTANCE * forces.distance;
    for (const e of this.graph.edges) {
      const s = e.source;
      const t = e.target;
      if (!active[s] || !active[t]) continue;
      const dx = x[t] + vx[t] - x[s] - vx[s] || 0.01;
      const dy = y[t] + vy[t] - y[s] - vy[s] || 0.01;
      const len = Math.sqrt(dx * dx + dy * dy);
      const k = ((len - linkDistance) / len) * alpha * forces.link * (1 / Math.min(degree[s], degree[t]));
      const bias = degree[s] / (degree[s] + degree[t]);
      vx[t] -= dx * k * bias;
      vy[t] -= dy * k * bias;
      vx[s] += dx * k * (1 - bias);
      vy[s] += dy * k * (1 - bias);
    }

    const gravity = GRAVITY * forces.center;
    for (let i = 0; i < n; i++) {
      if (pinned[i] || !active[i]) {
        vx[i] = 0;
        vy[i] = 0;
        continue;
      }
      vx[i] = (vx[i] - x[i] * gravity * alpha) * VELOCITY_DECAY;
      vy[i] = (vy[i] - y[i] * gravity * alpha) * VELOCITY_DECAY;
      x[i] += vx[i];
      y[i] += vy[i];
    }

    this.alpha += (0 - this.alpha) * ALPHA_DECAY;
  }

  /** Runs to rest synchronously (reduced motion, tests). */
  settle(maxTicks = 400): void {
    for (let i = 0; i < maxTicks && !this.settled; i++) this.tick();
  }

  /** Bounds of the active nodes. */
  bounds(): { minX: number; minY: number; maxX: number; maxY: number } {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < this.x.length; i++) {
      if (!this.active[i]) continue;
      minX = Math.min(minX, this.x[i]);
      maxX = Math.max(maxX, this.x[i]);
      minY = Math.min(minY, this.y[i]);
      maxY = Math.max(maxY, this.y[i]);
    }
    if (minX === Infinity) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    return { minX, minY, maxX, maxY };
  }
}
