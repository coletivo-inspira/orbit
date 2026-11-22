import { describe, expect, it } from "vitest";
import { rovingIndex } from "./roving";

describe("rovingIndex", () => {
  it("moves with left/right arrows and wraps", () => {
    expect(rovingIndex("ArrowRight", 0, 2)).toBe(1);
    expect(rovingIndex("ArrowRight", 1, 2)).toBe(0);
    expect(rovingIndex("ArrowLeft", 0, 2)).toBe(1);
  });

  it("supports Home/End and vertical groups", () => {
    expect(rovingIndex("End", 0, 3)).toBe(2);
    expect(rovingIndex("Home", 2, 3)).toBe(0);
    expect(rovingIndex("ArrowDown", 0, 3, "vertical")).toBe(1);
    expect(rovingIndex("ArrowRight", 0, 3, "vertical")).toBeNull();
  });

  it("ignores other keys", () => {
    expect(rovingIndex("Enter", 0, 2)).toBeNull();
  });
});
