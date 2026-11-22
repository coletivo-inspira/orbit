import { describe, expect, it } from "vitest";
import { hasTalked, MINI_CHAT_MAX_LENGTH, recordLine, SEED_CONVERSATIONS } from "./conversas";

describe("recordLine", () => {
  it("keeps only the newest line from each side", () => {
    let convs = recordLine({}, "p1", "me", "Oi!");
    convs = recordLine(convs, "p1", "them", "Oi, tudo bem?");
    convs = recordLine(convs, "p1", "me", "Tudo e você?");
    expect(convs.p1).toEqual({ mine: "Tudo e você?", theirs: "Oi, tudo bem?" });
  });

  it("starts the other side empty, so the UI can show an empty balloon", () => {
    expect(recordLine({}, "p2", "me", "Bora?").p2).toEqual({ mine: "Bora?", theirs: null });
  });

  it("trims, caps the length and ignores blank lines or unknown profiles", () => {
    const long = "a".repeat(MINI_CHAT_MAX_LENGTH + 20);
    expect(recordLine({}, "p1", "me", `  ${long}  `).p1.mine).toHaveLength(MINI_CHAT_MAX_LENGTH);
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
    expect(values.some((c) => c.theirs === null)).toBe(true);
  });
});
