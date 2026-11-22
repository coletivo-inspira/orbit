import { describe, expect, it } from "vitest";
import { avatarSvgDocument, avatarSvgInner } from "@/lib/avatarSvg";
import { COMMUNITY_POSTS } from "@/lib/data/posts";
import { DEMO_USER } from "@/lib/data/user";
import { buildCommunityTimeline } from "@/lib/communityTimeline";
import { ForceLayout } from "./forceLayout";
import { DEFAULT_GRAPH_DISPLAY, sanitizeGraphDisplay, sanitizePins, serializePins } from "./graphDisplay";
import { labelSize, spriteBucket } from "./graphSprites";
import { hitTest, labelOpacity, popScale } from "./graphView";

describe("sprite sizes", () => {
  it("snaps up to a bucket, so bitmaps are only scaled down a little", () => {
    for (const px of [5, 13, 40, 41, 99, 300]) {
      const b = spriteBucket(px);
      expect(b).toBeGreaterThanOrEqual(Math.min(px, 448));
      expect(b / Math.max(px, 12)).toBeLessThanOrEqual(1.34);
    }
    expect(spriteBucket(5000)).toBe(448);
  });

  it("changes label sizes in even device-px steps", () => {
    expect(labelSize(11)).toBe(12);
    expect(labelSize(13)).toBe(14);
    expect(labelSize(2)).toBe(6);
  });
});

describe("hitTest", () => {
  const xs = [0, 30, 100];
  const ys = [0, 0, 0];
  const r = (i: number) => [10, 10, 4][i];
  it("finds the disc under the pointer, the nearest when they overlap", () => {
    expect(hitTest(28, 2, xs, ys, r, [1, 1, 1])).toBe(1);
    expect(hitTest(15, 0, xs, ys, r, [1, 1, 1])).toBe(-1);
    expect(hitTest(106, 0, xs, ys, r, [1, 1, 1], 3)).toBe(2);
  });

  it("ignores nodes that are not on screen yet (timelapse)", () => {
    expect(hitTest(30, 0, xs, ys, r, [1, 0, 1])).toBe(-1);
  });
});

describe("animation curves", () => {
  it("pops nodes in with a small overshoot", () => {
    expect(popScale(0)).toBeCloseTo(0);
    expect(Math.max(...[100, 200, 300, 400].map(popScale))).toBeGreaterThan(1);
    expect(popScale(1000)).toBe(1);
  });

  it("fades labels in around the zoom threshold", () => {
    expect(labelOpacity(0.3, 0.8)).toBe(0);
    expect(labelOpacity(0.72, 0.8)).toBeGreaterThan(0);
    expect(labelOpacity(0.72, 0.8)).toBeLessThan(1);
    expect(labelOpacity(1, 0.8)).toBe(1);
  });
});

describe("pins", () => {
  it("round-trips through storage and drops bad entries", () => {
    const pins = new Map([["p1", { x: 12.345, y: -8 }]]);
    const restored = sanitizePins(JSON.parse(JSON.stringify(serializePins(pins))));
    expect(restored.get("p1")).toEqual({ x: 12.3, y: -8 });
    expect(sanitizePins({ a: [1], b: ["x", 2], c: [1e9, 0], d: [3, 4] })).toEqual(new Map([["d", { x: 3, y: 4 }]]));
    expect(sanitizePins([1, 2]).size).toBe(0);
  });

  it("pins on drag by default", () => {
    expect(DEFAULT_GRAPH_DISPLAY.pinOnDrag).toBe(true);
    expect(sanitizeGraphDisplay({ pinOnDrag: false }).pinOnDrag).toBe(false);
  });
});

describe("avatar SVG", () => {
  it("is the same face for the component and the canvas", () => {
    expect(avatarSvgDocument(DEMO_USER.avatar, 64)).toContain(avatarSvgInner(DEMO_USER.avatar, "g"));
  });

  it("never lets markup through the colors", () => {
    const svg = avatarSvgInner({ ...DEMO_USER.avatar, bg: '"/><script>alert(1)</script>' }, "x");
    expect(svg).not.toContain("<script");
  });
});

describe("dragging", () => {
  it("keeps the layout warm while a node is held, then lets it settle", () => {
    const layout = new ForceLayout(buildCommunityTimeline(COMMUNITY_POSTS));
    layout.settle();
    layout.alphaTarget = 0.3;
    layout.reheat(0.3);
    for (let i = 0; i < 500; i++) layout.tick();
    expect(layout.settled).toBe(false);
    expect(layout.alpha).toBeCloseTo(0.3, 1);
    layout.alphaTarget = 0;
    layout.settle(2000);
    expect(layout.settled).toBe(true);
  });
});
