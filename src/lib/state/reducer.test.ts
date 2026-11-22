import { describe, expect, it } from "vitest";
import { BIO_MAX_LENGTH, createInitialState, orbitReducer, sanitizeStoredUser, TOPICS_MAX } from "./reducer";

describe("orbitReducer", () => {
  it("closes modals when switching tabs", () => {
    const opened = orbitReducer(createInitialState(), { type: "openProfile", id: "p1" });
    const next = orbitReducer(opened, { type: "setTab", tab: "parque" });
    expect(next.activeTab).toBe("parque");
    expect(next.selectedProfileId).toBeNull();
  });

  it("keeps at least one intention active", () => {
    let state = createInitialState();
    state = orbitReducer(state, { type: "toggleIntention", id: "amizade" });
    state = orbitReducer(state, { type: "toggleIntention", id: "apoio" });
    expect(state.user.intentions).toEqual(["troca"]);
    const unchanged = orbitReducer(state, { type: "toggleIntention", id: "troca" });
    expect(unchanged.user.intentions).toEqual(["troca"]);
  });

  it("moves the primary intention when it is removed", () => {
    const state = orbitReducer(createInitialState(), { type: "toggleIntention", id: "troca" });
    expect(state.user.intentions).not.toContain("troca");
    expect(state.user.primaryIntention).toBe(state.user.intentions[0]);
  });

  it("adds the intention when it becomes primary", () => {
    const state = orbitReducer(createInitialState(), { type: "setPrimaryIntention", id: "casual" });
    expect(state.user.primaryIntention).toBe("casual");
    expect(state.user.intentions).toContain("casual");
  });

  it("caps the bio length", () => {
    const state = orbitReducer(createInitialState(), { type: "updateBio", bio: "x".repeat(500) });
    expect(state.user.bio).toHaveLength(BIO_MAX_LENGTH);
  });

  it("toggles likes symmetrically", () => {
    const initial = createInitialState();
    const before = initial.posts.find((p) => p.id === "c1")!;
    const liked = orbitReducer(initial, { type: "togglePostLike", id: "c1" });
    const unliked = orbitReducer(liked, { type: "togglePostLike", id: "c1" });
    expect(liked.posts.find((p) => p.id === "c1")!.likes).toBe(before.likes + 1);
    expect(unliked.posts.find((p) => p.id === "c1")).toEqual(before);
  });

  it("ignores blank comments and trims the rest", () => {
    const initial = createInitialState();
    expect(orbitReducer(initial, { type: "addComment", id: "c1", text: "   " })).toBe(initial);
    const next = orbitReducer(initial, { type: "addComment", id: "c1", text: "  oi  " });
    const comments = next.posts.find((p) => p.id === "c1")!.comments;
    expect(comments.at(-1)).toMatchObject({ author: initial.user.name, text: "oi" });
  });

  it("does not mutate the shared demo data", () => {
    const a = createInitialState();
    orbitReducer(a, { type: "toggleApp", id: "bumble" });
    expect(createInitialState().user.apps.bumble.active).toBe(false);
  });

  it("merges, keeps and clears Órbita filters", () => {
    let state = orbitReducer(createInitialState(), { type: "updateOrbitaFilters", patch: { genders: ["travesti"] } });
    state = orbitReducer(state, { type: "updateOrbitaFilters", patch: { prepOnly: true } });
    expect(state.orbitaFilters.genders).toEqual(["travesti"]);
    expect(state.orbitaFilters.prepOnly).toBe(true);
    state = orbitReducer(state, { type: "setTab", tab: "parque" });
    expect(state.orbitaFilters.genders).toEqual(["travesti"]);
    state = orbitReducer(state, { type: "clearOrbitaFilters" });
    expect(state.orbitaFilters).toEqual(createInitialState().orbitaFilters);
  });

  it("opens the filter sheet alone and closes it with the other modals", () => {
    let state = orbitReducer(createInitialState(), { type: "openProfile", id: "p1" });
    state = orbitReducer(state, { type: "openOrbitaFilters" });
    expect(state.orbitaFiltersOpen).toBe(true);
    expect(state.selectedProfileId).toBeNull();
    expect(orbitReducer(state, { type: "closeModals" }).orbitaFiltersOpen).toBe(false);
    expect(orbitReducer(state, { type: "openProfile", id: "p2" }).orbitaFiltersOpen).toBe(false);
  });

  it("sets the sort order", () => {
    expect(orbitReducer(createInitialState(), { type: "setOrbitaSort", sort: "afinidade" }).orbitaSort).toBe(
      "afinidade",
    );
  });

  it("toggles topics up to the limit", () => {
    let state = createInitialState();
    expect(orbitReducer(state, { type: "toggleTopic", id: "cafe" }).user.topics).not.toContain("cafe");
    const extra = ["games", "anime", "livros", "mpb", "pop"] as const;
    for (const id of extra) state = orbitReducer(state, { type: "toggleTopic", id });
    expect(state.user.topics).toHaveLength(TOPICS_MAX);
    expect(orbitReducer(state, { type: "toggleTopic", id: "vinho" })).toBe(state);
  });
});

describe("sanitizeStoredUser", () => {
  it("rejects payloads without valid intentions", () => {
    expect(sanitizeStoredUser(null)).toBeNull();
    expect(sanitizeStoredUser({ intentions: ["hack"] })).toBeNull();
  });

  it("keeps editable fields and fills missing apps with defaults", () => {
    const user = sanitizeStoredUser({
      bio: "oi",
      isPublic: false,
      intentions: ["casual", "casual", "bogus"],
      primaryIntention: "troca",
      apps: { insta: { active: false, handle: "@eu" } },
      name: "Injected",
    })!;
    expect(user.bio).toBe("oi");
    expect(user.isPublic).toBe(false);
    expect(user.intentions).toEqual(["casual"]);
    expect(user.primaryIntention).toBe("casual");
    expect(user.apps.insta).toEqual({ active: false, handle: "@eu" });
    expect(user.apps.spotify).toEqual(createInitialState().user.apps.spotify);
    expect(user.name).toBe(createInitialState().user.name);
    expect(user.topics).toEqual(createInitialState().user.topics);
  });

  it("keeps only known topics", () => {
    const user = sanitizeStoredUser({ intentions: ["troca"], topics: ["cafe", "hack", "cafe", 3, "mpb"] })!;
    expect(user.topics).toEqual(["cafe", "mpb"]);
  });
});
