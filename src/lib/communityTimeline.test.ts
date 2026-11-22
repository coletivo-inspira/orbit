import { describe, expect, it } from "vitest";
import { buildPost } from "@/lib/community";
import { COMMUNITY_POSTS } from "@/lib/data/posts";
import { ForceLayout } from "@/lib/engines/forceLayout";
import { activeAt, buildCommunityTimeline, formatHoursAgo, parseHoursAgo } from "./communityTimeline";

describe("parseHoursAgo", () => {
  it("reads the demo's relative times", () => {
    expect(parseHoursAgo("agora")).toBe(0);
    expect(parseHoursAgo("há 40 min")).toBeCloseTo(40 / 60);
    expect(parseHoursAgo("há 4 h")).toBe(4);
    expect(parseHoursAgo("há 9 horas")).toBe(9);
    expect(parseHoursAgo("há 2 dias")).toBe(48);
    expect(parseHoursAgo("ontem")).toBe(24);
    expect(parseHoursAgo("Hoje · 14:20")).toBeNull();
  });

  it("formats back for the replay clock", () => {
    expect(formatHoursAgo(0)).toBe("agora");
    expect(formatHoursAgo(0.5)).toBe("há 30 min");
    expect(formatHoursAgo(30)).toBe("ontem");
    expect(formatHoursAgo(74)).toBe("há 3 dias");
  });
});

describe("buildCommunityTimeline", () => {
  const timeline = buildCommunityTimeline(COMMUNITY_POSTS);

  it("plays from the oldest interaction to the newest", () => {
    const ages = timeline.steps.map((s) => s.hoursAgo);
    expect([...ages].sort((a, b) => b - a)).toEqual(ages);
  });

  it("shows every post, comment and reply once, each after what it answers", () => {
    const count = (kind: string) => timeline.nodes.filter((n) => n.kind === kind).length;
    expect(count("post")).toBe(COMMUNITY_POSTS.length);
    expect(count("comment")).toBe(COMMUNITY_POSTS.reduce((n, p) => n + p.comments.length, 0));
    expect(count("reply")).toBe(
      COMMUNITY_POSTS.reduce((n, p) => n + p.comments.reduce((m, c) => m + (c.replies?.length ?? 0), 0), 0),
    );
    for (const e of timeline.edges) {
      if (e.kind === "tag") continue;
      expect(timeline.stepOf[e.target]).toBeLessThan(timeline.stepOf[e.source]);
    }
  });

  it("links replies to comments, comments to posts and items to tags", () => {
    for (const e of timeline.edges) {
      const [s, t] = [timeline.nodes[e.source].kind, timeline.nodes[e.target].kind];
      if (e.kind === "resposta") expect([s, t]).toEqual(["reply", "comment"]);
      if (e.kind === "comentario") expect([s, t]).toEqual(["comment", "post"]);
      if (e.kind === "tag") expect(t).toBe("tag");
    }
  });

  it("never tags a comment in a health category with its own words", () => {
    for (const e of timeline.edges) {
      const source = timeline.nodes[e.source];
      if (e.kind !== "tag" || source.kind === "post" || source.kind === "tag") continue;
      const post = COMMUNITY_POSTS.find((p) => p.id === source.postId)!;
      expect(post.category).toBe("debates");
    }
  });

  it("shares tag nodes between posts that use the same keyword", () => {
    const tagIds = timeline.nodes.filter((n) => n.kind === "tag").map((n) => n.id);
    expect(new Set(tagIds).size).toBe(tagIds.length);
  });

  it("puts a post written now at the end, and can leave tags out", () => {
    const mine = buildPost(
      {
        kind: "discussao",
        category: "debates",
        title: "Cinema no parque sábado",
        body: "Quem topa uma sessão de cinema no Parque?",
      },
      "u1",
      "Lucas",
    );
    const t = buildCommunityTimeline([mine, ...COMMUNITY_POSTS]);
    expect(t.steps.at(-1)!.caption).toContain("Cinema no parque");
    expect(buildCommunityTimeline(COMMUNITY_POSTS, { tags: false }).nodes.some((n) => n.kind === "tag")).toBe(false);
  });

  it("reveals nodes step by step", () => {
    expect(activeAt(timeline, -1).every((v) => v === 0)).toBe(true);
    expect(activeAt(timeline, timeline.steps.length - 1).every((v) => v === 1)).toBe(true);
    expect(activeAt(timeline, 0).reduce((a, b) => a + b, 0)).toBe(timeline.steps[0].nodes.length);
  });
});

describe("ForceLayout on the timeline", () => {
  it("keeps avatars apart and only moves active nodes", () => {
    const timeline = buildCommunityTimeline(COMMUNITY_POSTS);
    const layout = new ForceLayout(timeline, { radius: () => 14 });
    const half = activeAt(timeline, Math.floor(timeline.steps.length / 2));
    layout.active.set(half);
    const frozen = [...half].findIndex((v) => v === 0);
    const before = [layout.x[frozen], layout.y[frozen]];
    layout.settle();
    expect([layout.x[frozen], layout.y[frozen]]).toEqual(before);
    let overlaps = 0;
    for (let i = 0; i < half.length; i++) {
      for (let j = i + 1; j < half.length; j++) {
        if (!half[i] || !half[j]) continue;
        if (Math.hypot(layout.x[i] - layout.x[j], layout.y[i] - layout.y[j]) < 20) overlaps++;
      }
    }
    expect(overlaps).toBe(0);
  });

  it("warm starts from previous positions instead of restarting", () => {
    const timeline = buildCommunityTimeline(COMMUNITY_POSTS);
    const first = new ForceLayout(timeline);
    first.settle();
    const second = new ForceLayout(timeline, { initial: first.positions() });
    expect(second.alpha).toBeLessThan(1);
    expect(second.x[3]).toBe(first.x[3]);
  });
});
