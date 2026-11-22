import { describe, expect, it } from "vitest";
import { SIMULATED_PROFILES } from "@/lib/data/profiles";
import {
  activeFilterCount,
  EMPTY_FILTERS,
  matchesFilters,
  monthsBetween,
  selectOrbitaProfiles,
  sharedTopics,
  toggleInList,
  type OrbitaFilters,
  type OrbitaQuery,
} from "./orbitaFilters";

const filters = (patch: Partial<OrbitaFilters>): OrbitaFilters => ({ ...EMPTY_FILTERS, ...patch });
const query = (patch: Partial<OrbitaQuery> = {}): OrbitaQuery => ({
  intention: "all",
  filters: EMPTY_FILTERS,
  sort: "proximidade",
  userTopics: [],
  today: "2026-11",
  ...patch,
});
const byId = (id: string) => SIMULATED_PROFILES.find((p) => p.id === id)!;

describe("simulated profiles", () => {
  it("has a large, adult and diverse roster", () => {
    expect(SIMULATED_PROFILES.length).toBeGreaterThanOrEqual(36);
    expect(SIMULATED_PROFILES.every((p) => p.age >= 18)).toBe(true);
    const genders = new Set(SIMULATED_PROFILES.map((p) => p.gender));
    for (const g of ["homem-trans", "mulher-trans", "travesti", "nao-binarie"] as const) expect(genders).toContain(g);
    expect(new Set(SIMULATED_PROFILES.map((p) => p.id)).size).toBe(SIMULATED_PROFILES.length);
  });

  it("keeps the Parque cast stable", () => {
    expect(SIMULATED_PROFILES.slice(0, 7).map((p) => [p.id, p.name, p.inPark])).toEqual([
      ["p1", "Matheus", true],
      ["p2", "Rafa", true],
      ["p3", "Thiago", true],
      ["p4", "Dani", true],
      ["p5", "Diego", true],
      ["p6", "Bruno", true],
      ["p7", "Leo", true],
    ]);
  });
});

describe("matchesFilters", () => {
  it("lets everyone through with empty filters", () => {
    expect(SIMULATED_PROFILES.every((p) => matchesFilters(p, EMPTY_FILTERS))).toBe(true);
  });

  it("shows only trans people when the gender group asks for it", () => {
    const f = filters({ genders: ["homem-trans", "mulher-trans", "travesti"] });
    const result = SIMULATED_PROFILES.filter((p) => matchesFilters(p, f));
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((p) => ["homem-trans", "mulher-trans", "travesti"].includes(p.gender))).toBe(true);
  });

  it("ORs inside a group and ANDs across groups", () => {
    const f = filters({ tribes: ["bear", "otter"], lookingFor: ["namoro"] });
    for (const p of SIMULATED_PROFILES) {
      const expected = p.tribes.some((t) => t === "bear" || t === "otter") && p.lookingFor.includes("namoro");
      expect(matchesFilters(p, f), p.name).toBe(expected);
    }
  });

  it("treats an empty tribe list as Sem tribo", () => {
    const p = { ...byId("p13"), tribes: [] };
    expect(matchesFilters(p, filters({ tribes: ["sem-tribo"] }))).toBe(true);
    expect(matchesFilters(p, filters({ tribes: ["bear"] }))).toBe(false);
  });

  it("drops blank optional fields only when that group is filtering", () => {
    const noPosition = byId("p3");
    expect(noPosition.position).toBeUndefined();
    expect(matchesFilters(noPosition, EMPTY_FILTERS)).toBe(true);
    expect(matchesFilters(noPosition, filters({ positions: ["versatil"] }))).toBe(false);
    const noWeight = byId("p10");
    expect(noWeight.weightKg).toBeUndefined();
    expect(matchesFilters(noWeight, filters({ weight: { min: 50, max: null } }))).toBe(false);
  });

  it("applies inclusive numeric ranges", () => {
    const p = byId("p1");
    expect(matchesFilters(p, filters({ age: { min: 26, max: 26 } }))).toBe(true);
    expect(matchesFilters(p, filters({ age: { min: 27, max: null } }))).toBe(false);
    expect(matchesFilters(p, filters({ height: { min: null, max: 175 } }))).toBe(false);
  });

  it("filters the NSFW flag both ways and ignores undeclared values", () => {
    const yes = byId("p2");
    const no = byId("p1");
    const unknown = byId("p6");
    expect(unknown.acceptsNsfw).toBeUndefined();
    expect([yes, no, unknown].map((p) => matchesFilters(p, filters({ nsfw: "sim" })))).toEqual([true, false, false]);
    expect([yes, no, unknown].map((p) => matchesFilters(p, filters({ nsfw: "nao" })))).toEqual([false, true, false]);
  });

  it("checks PrEP and test recency against the given month", () => {
    const p = { ...byId("p1"), health: { prep: true, lastTest: "2026-09" } };
    expect(matchesFilters(p, filters({ prepOnly: true }))).toBe(true);
    expect(matchesFilters(p, filters({ testedWithinMonths: 3 }), "2026-11")).toBe(true);
    expect(matchesFilters(p, filters({ testedWithinMonths: 1 }), "2026-11")).toBe(false);
    expect(matchesFilters({ ...p, health: {} }, filters({ testedWithinMonths: 12 }))).toBe(false);
  });
});

describe("activeFilterCount", () => {
  it("counts each active group once", () => {
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0);
    const f = filters({
      genders: ["travesti", "mulher-trans"],
      age: { min: 25, max: null },
      nsfw: "nao",
      prepOnly: true,
      onlineOnly: true,
    });
    expect(activeFilterCount(f)).toBe(5);
  });
});

describe("selectOrbitaProfiles", () => {
  it("sorts by distance by default", () => {
    const result = selectOrbitaProfiles(SIMULATED_PROFILES, query());
    expect(result.map((p) => p.distanceM)).toEqual([...result.map((p) => p.distanceM)].sort((a, b) => a - b));
  });

  it("combines the intention chip with the advanced filters", () => {
    const result = selectOrbitaProfiles(
      SIMULATED_PROFILES,
      query({ intention: "namoro", filters: filters({ genders: ["mulher-cis"] }) }),
    );
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((p) => p.gender === "mulher-cis" && p.intentions.includes("namoro"))).toBe(true);
  });

  it("boosts shared topics first when sorting by affinity", () => {
    const userTopics = ["games", "anime", "tecnologia"] as const;
    const result = selectOrbitaProfiles(SIMULATED_PROFILES, query({ sort: "afinidade", userTopics: [...userTopics] }));
    const scores = result.map((p) => sharedTopics([...userTopics], p.topics).length);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(scores[0]).toBe(3);
  });

  it("does not reorder the shared profile list", () => {
    const before = SIMULATED_PROFILES.map((p) => p.id);
    selectOrbitaProfiles(SIMULATED_PROFILES, query({ sort: "afinidade", userTopics: ["mpb"] }));
    expect(SIMULATED_PROFILES.map((p) => p.id)).toEqual(before);
  });
});

describe("body type and photo filters", () => {
  it("matches any checked body type, including not informed", () => {
    const result = selectOrbitaProfiles(SIMULATED_PROFILES, query({ filters: filters({ bodyTypes: ["esbelto"] }) }));
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((p) => p.bodyType === "esbelto")).toBe(true);
    const blank = SIMULATED_PROFILES.find((p) => p.bodyType === undefined)!;
    expect(matchesFilters(blank, filters({ bodyTypes: ["nao-informado"] }))).toBe(true);
    expect(matchesFilters(blank, filters({ bodyTypes: ["medio"] }))).toBe(false);
  });

  it("requires every checked photo option", () => {
    const p = byId("p1");
    const noPhoto = { ...p, photo: undefined };
    const noFace = { ...p, photos: { face: false, album: true } };
    expect(matchesFilters(noPhoto, filters({ photos: ["tem-fotos"] }))).toBe(false);
    expect(matchesFilters(noFace, filters({ photos: ["tem-fotos"] }))).toBe(true);
    expect(matchesFilters(noFace, filters({ photos: ["rosto"] }))).toBe(false);
    expect(matchesFilters(noFace, filters({ photos: ["album"] }))).toBe(true);
    expect(matchesFilters(noFace, filters({ photos: ["album", "rosto"] }))).toBe(false);
  });

  it("narrows the roster to profiles with an album", () => {
    const result = selectOrbitaProfiles(SIMULATED_PROFILES, query({ filters: filters({ photos: ["album"] }) }));
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThan(SIMULATED_PROFILES.length);
    expect(result.every((p) => p.photos.album)).toBe(true);
  });

  it("counts each new group once", () => {
    expect(activeFilterCount(filters({ bodyTypes: ["medio", "grande"], photos: ["album"] }))).toBe(2);
  });
});

describe("helpers", () => {
  it("toggles list membership", () => {
    expect(toggleInList(["a"], "b")).toEqual(["a", "b"]);
    expect(toggleInList(["a", "b"], "a")).toEqual(["b"]);
  });

  it("counts months across years", () => {
    expect(monthsBetween("2025-12", "2026-02")).toBe(2);
  });

  it("keeps the profile's tag order for shared topics", () => {
    expect(sharedTopics(["cafe", "cinema"], ["cinema", "livros", "cafe"])).toEqual(["cinema", "cafe"]);
  });
});
