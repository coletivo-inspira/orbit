import type { MusicGenreId } from "@/lib/data/music";
import type { Profile, TopicId } from "@/lib/types";

/** Where a link comes from: declared on the profile, open discussions in the Comunidade, or Spotify. */
export type LinkOrigin = "perfil" | "comunidade" | "musica";

export type GraphNode =
  | { kind: "me"; id: "me" }
  | { kind: "person"; id: string; profile: Profile }
  | { kind: "topic"; id: string; topic: TopicId; degree: number }
  | { kind: "genre"; id: string; genre: MusicGenreId; degree: number };

export interface GraphEdge {
  source: number;
  target: number;
  origin: LinkOrigin;
}

export interface InterestGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** Edge indices touching each node. */
  incident: number[][];
}

export interface GraphSources {
  perfil: boolean;
  comunidade: boolean;
  musica: boolean;
}

export interface GraphInput {
  profiles: readonly Profile[];
  userTopics: readonly TopicId[];
  userGenres: readonly MusicGenreId[];
  genresOf: (profile: Profile) => MusicGenreId[];
  /** Topics from open discussions, keyed by profile id ("me" for the user). */
  community: ReadonlyMap<string, ReadonlySet<TopicId>>;
  sources: GraphSources;
}

type InterestKey = `t:${TopicId}` | `g:${MusicGenreId}`;

function interestsOf(
  who: string,
  topics: readonly TopicId[],
  genres: readonly MusicGenreId[],
  input: GraphInput,
): Map<InterestKey, LinkOrigin> {
  const out = new Map<InterestKey, LinkOrigin>();
  if (input.sources.perfil) topics.forEach((t) => out.set(`t:${t}`, "perfil"));
  if (input.sources.comunidade) {
    input.community.get(who)?.forEach((t) => {
      if (!out.has(`t:${t}`)) out.set(`t:${t}`, "comunidade");
    });
  }
  if (input.sources.musica) genres.forEach((g) => out.set(`g:${g}`, "musica"));
  return out;
}

/**
 * Obsidian-style graph: people (and the user) linked to the interests they share.
 * Interests only become nodes when at least two people have them, so every hub connects someone.
 */
export function buildInterestGraph(input: GraphInput): InterestGraph {
  const people = [
    { id: "me", interests: interestsOf("me", input.userTopics, input.userGenres, input) },
    ...input.profiles.map((p) => ({ id: p.id, interests: interestsOf(p.id, p.topics, input.genresOf(p), input) })),
  ];

  const count = new Map<InterestKey, number>();
  for (const person of people) person.interests.forEach((_, key) => count.set(key, (count.get(key) ?? 0) + 1));

  const nodes: GraphNode[] = [
    { kind: "me", id: "me" },
    ...input.profiles.map((p) => ({ kind: "person" as const, id: p.id, profile: p })),
  ];
  const interestIndex = new Map<InterestKey, number>();
  for (const [key, n] of [...count].sort(([a], [b]) => a.localeCompare(b))) {
    if (n < 2) continue;
    interestIndex.set(key, nodes.length);
    nodes.push(
      key.startsWith("t:")
        ? { kind: "topic", id: key, topic: key.slice(2) as TopicId, degree: n }
        : { kind: "genre", id: key, genre: key.slice(2) as MusicGenreId, degree: n },
    );
  }

  const edges: GraphEdge[] = [];
  people.forEach((person, source) => {
    person.interests.forEach((origin, key) => {
      const target = interestIndex.get(key);
      if (target !== undefined) edges.push({ source, target, origin });
    });
  });

  const incident: number[][] = nodes.map(() => []);
  edges.forEach((e, i) => {
    incident[e.source].push(i);
    incident[e.target].push(i);
  });
  return { nodes, edges, incident };
}

/** Nodes and edges to emphasize when a node is focused: its own links, plus who shares them. */
export function focusSets(
  graph: InterestGraph,
  focus: number,
): { nodes: Set<number>; direct: Set<number>; shared: Set<number> } {
  const nodes = new Set([focus]);
  const direct = new Set(graph.incident[focus]);
  const shared = new Set<number>();
  const isHub = (i: number) => graph.nodes[i].kind === "topic" || graph.nodes[i].kind === "genre";
  for (const e of direct) {
    const other = graph.edges[e].source === focus ? graph.edges[e].target : graph.edges[e].source;
    nodes.add(other);
    if (isHub(focus) || !isHub(other)) continue;
    for (const e2 of graph.incident[other]) {
      if (direct.has(e2)) continue;
      shared.add(e2);
      nodes.add(graph.edges[e2].source);
    }
  }
  return { nodes, direct, shared };
}

const ALPHA_MIN = 0.002;
const ALPHA_DECAY = 1 - Math.pow(ALPHA_MIN, 1 / 300);
const VELOCITY_DECAY = 0.6;
const LINK_DISTANCE = 64;
const REPULSION_CUTOFF = 380;
const NEIGHBOR_OFFSETS: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];

/**
 * Deterministic force layout (d3-force style: many-body repulsion, springs, gravity).
 * Starts from a phyllotaxis spiral, so the same graph always settles the same way.
 */
export class ForceLayout {
  readonly x: Float64Array;
  readonly y: Float64Array;
  private readonly vx: Float64Array;
  private readonly vy: Float64Array;
  private readonly pinned: Uint8Array;
  private readonly charge: Float64Array;
  private readonly degree: Uint16Array;
  alpha = 1;

  constructor(private readonly graph: InterestGraph) {
    const n = graph.nodes.length;
    this.x = new Float64Array(n);
    this.y = new Float64Array(n);
    this.vx = new Float64Array(n);
    this.vy = new Float64Array(n);
    this.pinned = new Uint8Array(n);
    this.charge = new Float64Array(n);
    this.degree = new Uint16Array(n);
    graph.edges.forEach((e) => {
      this.degree[e.source]++;
      this.degree[e.target]++;
    });
    const golden = Math.PI * (3 - Math.sqrt(5));
    graph.nodes.forEach((node, i) => {
      const r = 14 * Math.sqrt(0.5 + i);
      this.x[i] = i === 0 ? 0 : r * Math.cos(i * golden);
      this.y[i] = i === 0 ? 0 : r * Math.sin(i * golden);
      this.charge[i] = node.kind === "person" || node.kind === "me" ? -260 : -180 - Math.min(node.degree, 12) * 12;
    });
    this.pinned[0] = 1;
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

  tick(): void {
    const { x, y, vx, vy, pinned, charge, degree } = this;
    const n = x.length;
    const alpha = this.alpha;

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
      vx[i] += (dx * charge[j] * alpha) / d2;
      vy[i] += (dy * charge[j] * alpha) / d2;
      vx[j] -= (dx * charge[i] * alpha) / d2;
      vy[j] -= (dy * charge[i] * alpha) / d2;
    };

    // Uniform grid with cutoff-sized cells: each pair is checked once, against its own and 4 neighbor cells.
    const cells = new Map<number, number[]>();
    const key = (cx: number, cy: number) => cx * 73856093 + cy;
    for (let i = 0; i < n; i++) {
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

    for (const e of this.graph.edges) {
      const s = e.source;
      const t = e.target;
      const dx = x[t] + vx[t] - x[s] - vx[s] || 0.01;
      const dy = y[t] + vy[t] - y[s] - vy[s] || 0.01;
      const len = Math.sqrt(dx * dx + dy * dy);
      const k = ((len - LINK_DISTANCE) / len) * alpha * (1 / Math.min(degree[s], degree[t]));
      const bias = degree[s] / (degree[s] + degree[t]);
      vx[t] -= dx * k * bias;
      vy[t] -= dy * k * bias;
      vx[s] += dx * k * (1 - bias);
      vy[s] += dy * k * (1 - bias);
    }

    for (let i = 0; i < n; i++) {
      if (pinned[i]) {
        vx[i] = 0;
        vy[i] = 0;
        continue;
      }
      vx[i] = (vx[i] - x[i] * 0.03 * alpha) * VELOCITY_DECAY;
      vy[i] = (vy[i] - y[i] * 0.03 * alpha) * VELOCITY_DECAY;
      x[i] += vx[i];
      y[i] += vy[i];
    }

    this.alpha += (0 - this.alpha) * ALPHA_DECAY;
  }

  /** Runs to rest synchronously (reduced motion, tests). */
  settle(maxTicks = 400): void {
    for (let i = 0; i < maxTicks && !this.settled; i++) this.tick();
  }

  bounds(): { minX: number; minY: number; maxX: number; maxY: number } {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < this.x.length; i++) {
      minX = Math.min(minX, this.x[i]);
      maxX = Math.max(maxX, this.x[i]);
      minY = Math.min(minY, this.y[i]);
      maxY = Math.max(maxY, this.y[i]);
    }
    return { minX, minY, maxX, maxY };
  }
}
