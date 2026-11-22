import { describe, expect, it } from "vitest";
import { EMPTY_FILTERS, selectOrbitaProfiles } from "@/lib/orbitaFilters";
import { GENERATED_PROFILE_COUNT, generateProfiles } from "./generatedProfiles";
import { ORBIT_PROFILES, profileById, SIMULATED_PROFILES } from "./profiles";

describe("generated profiles", () => {
  const generated = generateProfiles();

  it("are deterministic", () => {
    expect(generateProfiles()).toEqual(generated);
    expect(generateProfiles(5, 7)).not.toEqual(generateProfiles(5, 8));
  });

  it("fill the Órbita past 1000 people with unique ids", () => {
    expect(generated).toHaveLength(GENERATED_PROFILE_COUNT);
    expect(ORBIT_PROFILES.length).toBeGreaterThan(1000);
    expect(new Set(ORBIT_PROFILES.map((p) => p.id)).size).toBe(ORBIT_PROFILES.length);
    expect(profileById("g1")).toBe(generated.length ? ORBIT_PROFILES[SIMULATED_PROFILES.length] : undefined);
  });

  it("use illustrated avatars only, never a photo", () => {
    for (const p of generated) {
      expect(p.photo).toBeUndefined();
      expect(p.photos).toEqual({ face: false, album: false });
    }
  });

  it("stay farther than the curated portraits, so photos remain near the center", () => {
    const farthestCurated = Math.max(...SIMULATED_PROFILES.map((p) => p.distanceM));
    expect(Math.min(...generated.map((p) => p.distanceM))).toBeGreaterThan(farthestCurated);
  });

  it("are adults with coherent pronouns and valid choices", () => {
    for (const p of generated) {
      expect(p.age).toBeGreaterThanOrEqual(18);
      expect(p.intentions).toContain(p.primaryIntention);
      expect(p.topics.length).toBeGreaterThanOrEqual(3);
      if (p.gender.startsWith("homem")) expect(p.pronouns).toBe("ele");
      if (p.gender.startsWith("mulher") || p.gender === "travesti") expect(p.pronouns).toBe("ela");
    }
  });
});

describe("photo filters with avatar-only profiles", () => {
  const select = (photos: (typeof EMPTY_FILTERS)["photos"]) =>
    selectOrbitaProfiles(ORBIT_PROFILES, {
      intention: "all",
      filters: { ...EMPTY_FILTERS, photos },
      sort: "proximidade",
      userTopics: [],
    });

  it("leave avatar-only profiles out of every photo filter", () => {
    for (const need of ["tem-fotos", "rosto", "album"] as const) {
      const result = select([need]);
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((p) => p.photo)).toBe(true);
    }
  });

  it("keep everyone when no photo filter is active", () => {
    expect(select([])).toHaveLength(ORBIT_PROFILES.length);
  });
});
