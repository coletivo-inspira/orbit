import { commentTags, postTags } from "@/lib/community";
import { tagId } from "@/lib/keywords";
import type { CommunityCategory, CommunityPost, PostComment } from "@/lib/types";

export type TimelineNode =
  | {
      kind: "post";
      id: string;
      postId: string;
      title: string;
      category: CommunityCategory;
      author: string;
      profileId?: string;
      hoursAgo: number;
    }
  | {
      kind: "comment" | "reply";
      id: string;
      postId: string;
      author: string;
      profileId?: string;
      local?: boolean;
      text: string;
      hoursAgo: number;
    }
  | { kind: "tag"; id: string; tag: string; uses: number };

export type TimelineEdgeKind = "comentario" | "resposta" | "tag";

export interface TimelineEdge {
  source: number;
  target: number;
  kind: TimelineEdgeKind;
}

/** One moment of the replay: a post, comment or reply appearing, with the tags it brings. */
export interface TimelineStep {
  hoursAgo: number;
  /** Nodes revealed at this step (the item first, then its new tags). */
  nodes: number[];
  caption: string;
}

export interface CommunityTimeline {
  nodes: TimelineNode[];
  edges: TimelineEdge[];
  incident: number[][];
  steps: TimelineStep[];
  /** Step at which each node appears. */
  stepOf: number[];
  /** Node each one grows out of when it appears (-1: none). */
  near: number[];
}

/** Reads the demo's relative times ("há 40 min", "ontem", "agora") as hours ago. */
export function parseHoursAgo(time: string): number | null {
  const t = time.trim().toLowerCase();
  if (t === "agora") return 0;
  if (t === "ontem") return 24;
  const m = /(\d+)\s*(min|horas?|h|dias?)(?![a-z])/.exec(t);
  if (!m) return null;
  const v = Number(m[1]);
  if (m[2] === "min") return v / 60;
  if (m[2].startsWith("dia")) return v * 24;
  return v;
}

export function formatHoursAgo(hours: number): string {
  if (hours <= 0.02) return "agora";
  if (hours < 1) return `há ${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 24) return `há ${Math.round(hours)} h`;
  if (hours < 48) return "ontem";
  return `há ${Math.round(hours / 24)} dias`;
}

const shorten = (text: string, max = 42) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

/** Never older than what it answers, and ordered after it. */
function ageOf(item: PostComment, parentAge: number, seq: number): number {
  if (item.local) return 0;
  const parsed = parseHoursAgo(item.time);
  const age = parsed ?? parentAge * 0.6;
  return Math.max(0, Math.min(age, parentAge - 0.01 - seq * 0.001));
}

interface Event {
  hoursAgo: number;
  seq: number;
  post: CommunityPost;
  item?: PostComment;
  parent?: { item: PostComment; key: string };
  key: string;
}

/**
 * The community as a growing graph, Obsidian-timelapse style: posts appear in the order they were
 * written, then their comments and replies, each linked to the tags (keywords) it brings.
 */
export function buildCommunityTimeline(
  posts: readonly CommunityPost[],
  options: { tags?: boolean } = {},
): CommunityTimeline {
  const withTags = options.tags ?? true;
  const events: Event[] = [];
  let seq = 0;
  for (const post of posts) {
    events.push({ hoursAgo: post.ageHours, seq: seq++, post, key: `post:${post.id}` });
    post.comments.forEach((comment, ci) => {
      const commentAge = ageOf(comment, post.ageHours, ci);
      const key = `c:${post.id}:${ci}`;
      events.push({ hoursAgo: commentAge, seq: seq++, post, item: comment, key });
      comment.replies?.forEach((reply, ri) => {
        events.push({
          hoursAgo: ageOf(reply, commentAge, ri),
          seq: seq++,
          post,
          item: reply,
          parent: { item: comment, key },
          key: `r:${post.id}:${ci}:${ri}`,
        });
      });
    });
  }
  events.sort((a, b) => b.hoursAgo - a.hoursAgo || a.seq - b.seq);

  const nodes: TimelineNode[] = [];
  const edges: TimelineEdge[] = [];
  const steps: TimelineStep[] = [];
  const stepOf: number[] = [];
  const near: number[] = [];
  const indexOf = new Map<string, number>();

  const addNode = (node: TimelineNode, step: number, from: number) => {
    indexOf.set(node.id, nodes.length);
    nodes.push(node);
    stepOf.push(step);
    near.push(from);
    return nodes.length - 1;
  };

  for (const ev of events) {
    const step = steps.length;
    const revealed: number[] = [];
    let index: number;
    let caption: string;
    let tags: string[];
    const postIndex = indexOf.get(`post:${ev.post.id}`);

    if (!ev.item) {
      tags = withTags ? postTags(ev.post) : [];
      // A new post grows out of a tag it shares with what is already on screen, else the first post.
      const shared = tags.map((t) => indexOf.get(`tag:${tagId(t)}`)).find((i) => i !== undefined);
      index = addNode(
        {
          kind: "post",
          id: ev.key,
          postId: ev.post.id,
          title: ev.post.title,
          category: ev.post.category,
          author: ev.post.author,
          profileId: ev.post.authorProfileId,
          hoursAgo: ev.hoursAgo,
        },
        step,
        shared ?? (nodes.length ? 0 : -1),
      );
      caption = `${ev.post.author.split(" · ")[0]} publicou “${shorten(ev.post.title)}”`;
    } else {
      if (postIndex === undefined) continue;
      const isReply = Boolean(ev.parent);
      const target = isReply ? indexOf.get(ev.parent!.key) : postIndex;
      if (target === undefined) continue;
      tags = withTags ? commentTags(ev.item, ev.post.category) : [];
      index = addNode(
        {
          kind: isReply ? "reply" : "comment",
          id: ev.key,
          postId: ev.post.id,
          author: ev.item.author,
          profileId: ev.item.profileId,
          local: ev.item.local,
          text: ev.item.text,
          hoursAgo: ev.hoursAgo,
        },
        step,
        target,
      );
      edges.push({ source: index, target, kind: isReply ? "resposta" : "comentario" });
      caption = isReply
        ? `${ev.item.author} respondeu ${ev.parent!.item.author}`
        : `${ev.item.author} comentou em “${shorten(ev.post.title, 32)}”`;
    }
    revealed.push(index);

    for (const tag of tags) {
      const id = `tag:${tagId(tag)}`;
      let t = indexOf.get(id);
      if (t === undefined) {
        t = addNode({ kind: "tag", id, tag, uses: 0 }, step, index);
        revealed.push(t);
      }
      const node = nodes[t];
      if (node.kind === "tag") node.uses++;
      edges.push({ source: index, target: t, kind: "tag" });
    }
    if (tags.length) caption += ` · ${tags.map((t) => `#${t}`).join(" ")}`;
    steps.push({ hoursAgo: ev.hoursAgo, nodes: revealed, caption });
  }

  const incident: number[][] = nodes.map(() => []);
  edges.forEach((e, i) => {
    incident[e.source].push(i);
    incident[e.target].push(i);
  });
  return { nodes, edges, incident, steps, stepOf, near };
}

/** 1 for every node visible once `step` has played (-1: nothing yet). */
export function activeAt(timeline: CommunityTimeline, step: number): Uint8Array {
  const mask = new Uint8Array(timeline.nodes.length);
  timeline.stepOf.forEach((s, i) => {
    if (s <= step) mask[i] = 1;
  });
  return mask;
}
