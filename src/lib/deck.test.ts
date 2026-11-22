import { describe, expect, it } from "vitest";
import {
  cardPose,
  clampIndex,
  DECK_BEHIND,
  releaseTarget,
  rubberBand,
  shuffleTilt,
  springSettled,
  springStep,
  visibleRange,
  type SpringState,
} from "./deck";

describe("card deck", () => {
  it("renders only the leaving, front and peeking cards, however long the list", () => {
    expect(visibleRange(0, 1000)).toEqual([0, DECK_BEHIND + 1]);
    expect(visibleRange(10.4, 1000)).toEqual([10, 14]);
    expect(visibleRange(998, 1000)).toEqual([997, 999]);
    expect(visibleRange(0, 0)).toEqual([0, -1]);
    const [first, last] = visibleRange(500.5, 100_000);
    expect(last - first + 1).toBeLessThanOrEqual(DECK_BEHIND + 2);
  });

  it("keeps the front card upright and shuffles the ones behind to alternate sides", () => {
    const front = cardPose(4, 4);
    expect(front).toMatchObject({ x: 0, rotate: 0, scale: 1, opacity: 1, shade: 0 });
    const behind = [5, 6, 7].map((i) => cardPose(i, 4));
    for (const pose of behind) {
      expect(pose.zIndex).toBeLessThan(front.zIndex);
      expect(Math.abs(pose.rotate)).toBeGreaterThanOrEqual(6);
      expect(Math.abs(pose.rotate)).toBeLessThanOrEqual(11);
    }
    expect(Math.sign(behind[0].rotate)).not.toBe(Math.sign(behind[1].rotate));
    expect(behind[0].scale).toBeGreaterThan(behind[2].scale);
    expect(behind[0].zIndex).toBeGreaterThan(behind[2].zIndex);
    expect(cardPose(4 + DECK_BEHIND + 1, 4).opacity).toBe(0);
  });

  it("throws a seen card away along the orbit and fades it", () => {
    const leaving = cardPose(3, 3.5);
    expect(leaving.x).toBeLessThan(0);
    expect(leaving.y).toBeGreaterThan(0);
    expect(leaving.rotate).toBeLessThan(0);
    expect(leaving.opacity).toBeCloseTo(0.5);
    expect(cardPose(3, 4).opacity).toBe(0);
  });

  it("gives each card a stable, gentle tilt", () => {
    for (let i = 0; i < 50; i++) {
      expect(Math.abs(shuffleTilt(i))).toBeLessThanOrEqual(1);
      expect(shuffleTilt(i)).toBe(shuffleTilt(i));
    }
  });

  it("resists drags past either end", () => {
    expect(rubberBand(2, 5)).toBe(2);
    expect(rubberBand(-3, 5)).toBeGreaterThan(-0.6);
    expect(rubberBand(-3, 5)).toBeLessThan(0);
    expect(rubberBand(9, 5)).toBeLessThan(4.6);
  });

  it("settles on the nearest card, carried a few cards by a flick", () => {
    expect(releaseTarget(2.3, 0, 10, 2)).toBe(2);
    expect(releaseTarget(2.3, 4, 10, 2)).toBe(3);
    expect(releaseTarget(2.4, 60, 10, 2)).toBe(2 + DECK_BEHIND);
    expect(releaseTarget(0.2, -30, 10, 0)).toBe(0);
    expect(releaseTarget(8.9, 30, 10, 9)).toBe(9);
    expect(clampIndex(-1, 3)).toBe(0);
    expect(clampIndex(7, 3)).toBe(2);
  });

  it("springs to the target and comes to rest", () => {
    let state: SpringState = { position: 0, velocity: 0 };
    let frames = 0;
    while (!springSettled(state, 1) && frames < 600) {
      state = springStep(state, 1, 1 / 60);
      frames++;
    }
    expect(frames).toBeLessThan(120);
    expect(state.position).toBeCloseTo(1, 2);
  });
});
