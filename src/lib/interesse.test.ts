import { describe, expect, it } from "vitest";
import {
  buildInterestFeed,
  formatAgo,
  INTEREST_FEED,
  INTEREST_TAP_COUNT,
  interestEntryLabel,
  PROFILE_VIEWS,
  profileStatusLabels,
  RECEIVED_TAPS,
  receivedTapFrom,
} from "./interesse";

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

  it("merges views and toques into one pile, one card per person, most recent first", () => {
    const ids = INTEREST_FEED.map((e) => e.profile.id);
    expect(new Set(ids).size).toBe(ids.length);
    const people = new Set([...PROFILE_VIEWS, ...RECEIVED_TAPS].map((e) => e.profile.id));
    expect(ids.length).toBe(people.size);
    const times = INTEREST_FEED.map((e) => e.minutesAgo);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(INTEREST_FEED.filter((e) => e.tapMinutesAgo !== undefined)).toHaveLength(RECEIVED_TAPS.length);
    expect(INTEREST_FEED.filter((e) => e.opens > 0)).toHaveLength(PROFILE_VIEWS.length);
    expect(INTEREST_FEED.some((e) => e.opens > 1)).toBe(true);
  });

  it("keeps a person's latest time and adds up their profile opens", () => {
    const [a, b] = PROFILE_VIEWS;
    const feed = buildInterestFeed(
      [
        { profile: a.profile, minutesAgo: 90 },
        { profile: b.profile, minutesAgo: 40 },
        { profile: a.profile, minutesAgo: 300 },
      ],
      [{ profile: a.profile, minutesAgo: 10 }],
      () => 2,
    );
    expect(feed.map((e) => e.profile.id)).toEqual([a.profile.id, b.profile.id]);
    expect(feed[0]).toMatchObject({ minutesAgo: 10, opens: 4, tapMinutesAgo: 10 });
    expect(feed[1]).toMatchObject({ minutesAgo: 40, opens: 2 });
    expect(feed[1].tapMinutesAgo).toBeUndefined();
  });

  it("names each card for screen readers with its toque and repeat opens", () => {
    const tapped = INTEREST_FEED.find((e) => e.tapMinutesAgo !== undefined && e.opens > 1)!;
    expect(interestEntryLabel(tapped)).toBe(
      `${tapped.profile.name}, ${tapped.profile.age}, te deu um toque, abriu seu perfil ${tapped.opens} vezes`,
    );
    const once = INTEREST_FEED.find((e) => e.tapMinutesAgo === undefined && e.opens === 1)!;
    expect(interestEntryLabel(once)).toBe(`${once.profile.name}, ${once.profile.age}`);
    expect(INTEREST_TAP_COUNT).toBe(RECEIVED_TAPS.length);
  });

  it("speaks the same status the orb badges show, in badge order", () => {
    const base = INTEREST_FEED[0].profile;
    const quiet = { ...base, online: false, inPark: false, visitingFrom: undefined };
    expect(profileStatusLabels(quiet)).toEqual([]);
    expect(profileStatusLabels({ ...quiet, online: true, inPark: true, visitingFrom: "Recife" })).toEqual([
      "online",
      "de passagem, mora em Recife",
      "no Parque",
    ]);
    expect(profileStatusLabels(quiet, { mine: ["Oi"], theirs: ["Olá!"] })).toEqual(["última fala no chat: “Olá!”"]);
    expect(profileStatusLabels(quiet, { mine: ["Oi", "E aí?"], theirs: ["Olá!", "Tudo"] })).toEqual([
      "última fala no chat: “Tudo”",
    ]);
    expect(profileStatusLabels(quiet, { mine: ["Oi"], theirs: [] })).toEqual(["conversa sem resposta ainda"]);
    expect(profileStatusLabels(quiet, { mine: [], theirs: [] })).toEqual([]);
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
