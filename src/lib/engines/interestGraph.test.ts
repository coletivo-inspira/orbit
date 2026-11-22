import { describe, expect, it } from "vitest";
import { communityTopics } from "@/lib/community";
import { profileGenres, userGenres } from "@/lib/data/music";
import { COMMUNITY_POSTS } from "@/lib/data/posts";
import { SIMULATED_PROFILES } from "@/lib/data/profiles";
import { DEMO_USER } from "@/lib/data/user";
import type { CommunityPost } from "@/lib/types";
import { buildInterestGraph, focusSets, ForceLayout, type GraphInput, type GraphSources } from "./interestGraph";

const ALL: GraphSources = { perfil: true, comunidade: true, musica: true };

function input(sources: GraphSources = ALL, posts: CommunityPost[] = COMMUNITY_POSTS): GraphInput {
  return {
    profiles: SIMULATED_PROFILES,
    userTopics: DEMO_USER.topics,
    userGenres: userGenres(DEMO_USER),
    genresOf: profileGenres,
    community: communityTopics(posts),
    sources,
  };
}

describe("buildInterestGraph", () => {
  it("puts the user first, then people, then shared interests", () => {
    const g = buildInterestGraph(input());
    expect(g.nodes[0].kind).toBe("me");
    expect(g.nodes.slice(1, SIMULATED_PROFILES.length + 1).every((n) => n.kind === "person")).toBe(true);
    const hubs = g.nodes.slice(SIMULATED_PROFILES.length + 1);
    expect(hubs.length).toBeGreaterThan(0);
    expect(hubs.every((n) => (n.kind === "topic" || n.kind === "genre") && n.degree >= 2)).toBe(true);
  });

  it("links people to hubs only, with every edge pointing to an existing node", () => {
    const g = buildInterestGraph(input());
    for (const e of g.edges) {
      expect(["me", "person"]).toContain(g.nodes[e.source].kind);
      expect(["topic", "genre"]).toContain(g.nodes[e.target].kind);
    }
  });

  it("only adds music for people with an active Spotify badge", () => {
    const g = buildInterestGraph(input({ perfil: false, comunidade: false, musica: true }));
    const withMusic = new Set(g.edges.map((e) => g.nodes[e.source].id));
    for (const id of withMusic) {
      if (id === "me") continue;
      expect(SIMULATED_PROFILES.find((p) => p.id === id)!.apps.spotify?.active).toBe(true);
    }
    expect(withMusic.has("me")).toBe(true);
  });

  it("links from open discussions are marked as Comunidade and never come from health threads", () => {
    const g = buildInterestGraph(input({ perfil: false, comunidade: true, musica: false }));
    expect(g.edges.length).toBeGreaterThan(0);
    expect(g.edges.every((e) => e.origin === "comunidade")).toBe(true);

    const healthThread: CommunityPost = { ...COMMUNITY_POSTS[1], topics: ["saude-mental"] };
    const community = communityTopics([healthThread]);
    expect(community.size).toBe(0);
  });

  it("prefers the declared origin when a topic is both on the profile and in discussions", () => {
    const g = buildInterestGraph(input());
    const me = g.edges.filter((e) => e.source === 0);
    const tech = me.find((e) => g.nodes[e.target].id === "t:tecnologia");
    expect(tech?.origin).toBe("perfil");
  });
});

describe("focusSets", () => {
  it("highlights a person's links and who shares them", () => {
    const g = buildInterestGraph(input());
    const i = g.nodes.findIndex((n) => n.id === "p1");
    const { nodes, direct, shared } = focusSets(g, i);
    expect(direct.size).toBeGreaterThan(0);
    for (const e of direct) expect(g.edges[e].source).toBe(i);
    for (const e of shared) expect(nodes.has(g.edges[e].source)).toBe(true);
  });
});

describe("ForceLayout", () => {
  it("is deterministic, keeps the user at the center and stays finite", () => {
    const g = buildInterestGraph(input());
    const a = new ForceLayout(g);
    const b = new ForceLayout(g);
    a.settle();
    b.settle();
    expect(a.settled).toBe(true);
    expect([...a.x]).toEqual([...b.x]);
    expect(a.x[0]).toBe(0);
    expect(a.y[0]).toBe(0);
    expect([...a.x, ...a.y].every(Number.isFinite)).toBe(true);
  });

  it("pulls linked nodes closer than unrelated ones on average", () => {
    const g = buildInterestGraph(input());
    const layout = new ForceLayout(g);
    layout.settle();
    const dist = (i: number, j: number) => Math.hypot(layout.x[i] - layout.x[j], layout.y[i] - layout.y[j]);
    const linked = g.edges.reduce((sum, e) => sum + dist(e.source, e.target), 0) / g.edges.length;
    let all = 0;
    let pairs = 0;
    for (let i = 0; i < g.nodes.length; i++) {
      for (let j = i + 1; j < g.nodes.length; j++) {
        all += dist(i, j);
        pairs++;
      }
    }
    expect(linked).toBeLessThan(all / pairs);
  });
});
