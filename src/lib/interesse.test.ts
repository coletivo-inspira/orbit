import { describe, expect, it } from "vitest";
import { formatAgo, PROFILE_VIEWS, RECEIVED_TAPS, receivedTapFrom } from "./interesse";

describe("simulated Interesse", () => {
  it("lists distinct people, most recent first", () => {
    for (const events of [PROFILE_VIEWS, RECEIVED_TAPS]) {
      expect(new Set(events.map((e) => e.profile.id)).size).toBe(events.length);
      const times = events.map((e) => e.minutesAgo);
      expect(times).toEqual([...times].sort((a, b) => a - b));
    }
    expect(PROFILE_VIEWS).toHaveLength(31);
    expect(RECEIVED_TAPS).toHaveLength(15);
  });

  it("finds who tapped the user", () => {
    const first = RECEIVED_TAPS[0];
    expect(receivedTapFrom(first.profile.id)).toBe(first);
    expect(receivedTapFrom("nobody")).toBeUndefined();
  });

  it("formats relative times in Portuguese", () => {
    expect(formatAgo(0)).toBe("agora");
    expect(formatAgo(16)).toBe("há 16 min");
    expect(formatAgo(125)).toBe("há 2 h");
    expect(formatAgo(60 * 24)).toBe("há 1 dia");
    expect(formatAgo(60 * 24 * 3 + 5)).toBe("há 3 dias");
  });
});
