import type { MusicGenreId } from "@/lib/data/music";
import type { Profile, TopicId } from "@/lib/types";

export { ForceLayout } from "./forceLayout";

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

/** Rendered size of a hub dot, in px: hubs grow with how many people they connect. */
export function hubSize(degree: number): number {
  return 9 + Math.min(degree, 14) * 1.1;
}

/** Collision radius of a node at the default node size (avatar plus ring, with room for the name). */
export function interestNodeRadius(node: GraphNode): number {
  if (node.kind === "me") return 32;
  if (node.kind === "person") return 24;
  return hubSize(node.degree) / 2;
}
