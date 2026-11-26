import { describe, expect, it } from "vitest";
import { hasTalked, MAX_BALLOONS_PER_SPEAKER, MINI_CHAT_MAX_LENGTH, recordLine, SEED_CONVERSATIONS } from "./conversas";

describe("recordLine", () => {
  it("keeps the two newest lines from each side and drops the oldest", () => {
    let convs = recordLine({}, "p1", "me", "Oi!");
    convs = recordLine(convs, "p1", "them", "Oi, tudo bem?");
    convs = recordLine(convs, "p1", "me", "Tudo e você?");
    convs = recordLine(convs, "p1", "me", "Te achei no mapa");
    expect(convs.p1).toEqual({ mine: ["Tudo e você?", "Te achei no mapa"], theirs: ["Oi, tudo bem?"] });
    expect(convs.p1.mine).toHaveLength(MAX_BALLOONS_PER_SPEAKER);
  });

  it("starts the other side empty, so the UI can show an empty balloon", () => {
    expect(recordLine({}, "p2", "me", "Bora?").p2).toEqual({ mine: ["Bora?"], theirs: [] });
  });

  it("trims, caps the length and ignores blank lines or unknown profiles", () => {
    const long = "a".repeat(MINI_CHAT_MAX_LENGTH + 20);
    expect(recordLine({}, "p1", "me", `  ${long}  `).p1.mine[0]).toHaveLength(MINI_CHAT_MAX_LENGTH);
    const empty = {};
    expect(recordLine(empty, "p1", "me", "   ")).toBe(empty);
    expect(recordLine(empty, "ninguem", "me", "Oi")).toBe(empty);
  });

  it("returns the same object when nothing changes", () => {
    const convs = recordLine({}, "p1", "them", "Oi");
    expect(recordLine(convs, "p1", "them", "Oi")).toBe(convs);
  });
});

describe("seeds", () => {
  it("include someone who never replied", () => {
    const values = Object.values(SEED_CONVERSATIONS);
    expect(values.every(hasTalked)).toBe(true);
    expect(values.some((c) => c.theirs.length === 0)).toBe(true);
  });
});
