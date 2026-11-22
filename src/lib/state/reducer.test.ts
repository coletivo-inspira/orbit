import { describe, expect, it } from "vitest";
import { MODERATION_TEAM, sortPosts } from "@/lib/community";
import { RECEIVED_TAPS } from "@/lib/interesse";
import {
  BIO_MAX_LENGTH,
  createInitialState,
  orbitReducer,
  sanitizeStoredTaps,
  sanitizeStoredUser,
  TOPICS_MAX,
} from "./reducer";

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

  it("toggles votes symmetrically and switches direction", () => {
    const initial = createInitialState();
    const find = (s: typeof initial) => s.posts.find((p) => p.id === "c1")!;
    const before = find(initial);
    const up = orbitReducer(initial, { type: "votePost", id: "c1", direction: 1 });
    expect(find(up)).toMatchObject({ vote: 1, score: before.score + 1 });
    const down = orbitReducer(up, { type: "votePost", id: "c1", direction: -1 });
    expect(find(down)).toMatchObject({ vote: -1, score: before.score - 1 });
    const cleared = orbitReducer(down, { type: "votePost", id: "c1", direction: -1 });
    expect(find(cleared)).toEqual(before);
  });

  it("only accepts known regions", () => {
    const initial = createInitialState();
    const next = orbitReducer(initial, { type: "setRegion", regionId: "recife" });
    expect(next.regionId).toBe("recife");
    expect(orbitReducer(next, { type: "setRegion", regionId: "atlantida" })).toBe(next);
  });

  it("opens the composer exclusively and closes it with the other modals", () => {
    const article = orbitReducer(createInitialState(), { type: "openArticle", id: "c1" });
    const composing = orbitReducer(article, { type: "openComposer", kind: "artigo" });
    expect(composing).toMatchObject({ composerKind: "artigo", selectedArticleId: null });
    expect(orbitReducer(composing, { type: "closeModals" }).composerKind).toBeNull();
  });

  it("publishes community posts right away and opens the thread", () => {
    const initial = orbitReducer(createInitialState(), { type: "openComposer", kind: "discussao" });
    const next = orbitReducer(initial, {
      type: "submitPost",
      draft: {
        kind: "discussao",
        category: "debates",
        title: "  Rolê no domingo?  ",
        body: "Quem topa um piquenique no parque?",
      },
    });
    const post = next.posts[0];
    expect(post).toMatchObject({
      kind: "discussao",
      status: "publicado",
      title: "Rolê no domingo?",
      author: initial.user.name,
      score: 1,
      vote: 1,
    });
    expect(post.professional).toBeUndefined();
    expect(next).toMatchObject({ composerKind: null, selectedArticleId: post.id, communitySort: "new" });
  });

  it("rejects invalid drafts", () => {
    const initial = createInitialState();
    const short = orbitReducer(initial, {
      type: "submitPost",
      draft: { kind: "discussao", category: "debates", title: "oi", body: "curto" },
    });
    expect(short).toBe(initial);
    const noCredential = orbitReducer(initial, {
      type: "submitPost",
      draft: {
        kind: "artigo",
        category: "vacinas",
        title: "Vacina de HPV",
        body: "Texto longo o suficiente para passar.",
      },
    });
    expect(noCredential).toBe(initial);
  });

  it("sends professional articles to review until a moderator approves them", () => {
    const initial = createInitialState();
    const submitted = orbitReducer(initial, {
      type: "submitPost",
      draft: {
        kind: "artigo",
        category: "prevencao",
        title: "Como funciona a PEP no SUS",
        body: "Primeiro parágrafo do artigo.\n\nSegundo parágrafo com mais detalhes.",
        professional: { name: "Ana Souza", council: "CRM", registration: " 123456 ", uf: "MG" },
      },
    });
    const post = submitted.posts[0];
    expect(post).toMatchObject({
      kind: "artigo",
      status: "em_revisao",
      author: "Ana Souza · Médico(a)",
      professional: { name: "Ana Souza", council: "CRM", registration: "123456", uf: "MG" },
      content: ["Primeiro parágrafo do artigo.", "Segundo parágrafo com mais detalhes."],
    });
    expect(post.reviewedBy).toBeUndefined();

    const approved = orbitReducer(submitted, { type: "approveArticle", id: post.id });
    expect(approved.posts[0]).toMatchObject({ status: "publicado", reviewedBy: MODERATION_TEAM });
    expect(orbitReducer(approved, { type: "approveArticle", id: "c4" }).posts).toEqual(approved.posts);
  });

  it("ignores blank comments and trims the rest", () => {
    const initial = createInitialState();
    expect(orbitReducer(initial, { type: "addComment", id: "c1", text: "   " })).toBe(initial);
    const next = orbitReducer(initial, { type: "addComment", id: "c1", text: "  oi  " });
    const comments = next.posts.find((p) => p.id === "c1")!.comments;
    expect(comments.at(-1)).toMatchObject({ author: initial.user.name, text: "oi" });
  });

  it("adds a reply under the answered comment, and ignores unknown comments", () => {
    const initial = createInitialState();
    const next = orbitReducer(initial, { type: "addComment", id: "c7", text: "Boa!", replyTo: 0 });
    const post = next.posts.find((p) => p.id === "c7")!;
    expect(post.comments).toHaveLength(initial.posts.find((p) => p.id === "c7")!.comments.length);
    expect(post.comments[0].replies?.at(-1)).toMatchObject({ text: "Boa!", local: true });
    const unknown = orbitReducer(initial, { type: "addComment", id: "c7", text: "Boa!", replyTo: 99 });
    expect(unknown.posts.find((p) => p.id === "c7")).toEqual(initial.posts.find((p) => p.id === "c7"));
  });

  it("publishes the tags the author kept, or extracts them", () => {
    const draft = {
      kind: "discussao" as const,
      category: "debates" as const,
      title: "Sessão de cinema no Parque",
      body: "Quem topa uma sessão de cinema nacional no sábado?",
    };
    const kept = orbitReducer(createInitialState(), {
      type: "submitPost",
      draft: { ...draft, tags: ["#Cinema", "parque"] },
    });
    expect(kept.posts[0].tags).toEqual(["cinema", "parque"]);
    const auto = orbitReducer(createInitialState(), { type: "submitPost", draft });
    expect(auto.posts[0].tags).toContain("cinema");
  });

  it("does not mutate the shared demo data", () => {
    const a = createInitialState();
    orbitReducer(a, { type: "toggleApp", id: "bumble" });
    expect(createInitialState().user.apps.bumble.active).toBe(false);
  });

  it("starts on the world map and enters and leaves park rooms", () => {
    const initial = createInitialState();
    expect(initial.parkRoomId).toBeNull();
    const inParis = orbitReducer(initial, { type: "enterParkRoom", id: "paris-torre-eiffel" });
    expect(inParis.parkRoomId).toBe("paris-torre-eiffel");
    expect(orbitReducer(inParis, { type: "leaveParkRoom" }).parkRoomId).toBeNull();
  });

  it("keeps the current room when switching tabs", () => {
    const inRio = orbitReducer(createInitialState(), { type: "enterParkRoom", id: "rio-pao-de-acucar" });
    const away = orbitReducer(inRio, { type: "setTab", tab: "orbita" });
    expect(orbitReducer(away, { type: "setTab", tab: "parque" }).parkRoomId).toBe("rio-pao-de-acucar");
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

describe("Interesse", () => {
  it("switches between Visualizações and Toques", () => {
    const state = orbitReducer(createInitialState(), { type: "setInteresseTab", tab: "toques" });
    expect(state.interesseTab).toBe("toques");
  });

  it("records each tap once, newest first", () => {
    let state = createInitialState();
    state = orbitReducer(state, { type: "tapProfile", id: "p1" });
    state = orbitReducer(state, { type: "tapProfile", id: "p2" });
    const again = orbitReducer(state, { type: "tapProfile", id: "p1" });
    expect(again).toBe(state);
    expect(state.sentTaps).toEqual(["p2", "p1"]);
  });

  it("taps back someone who tapped the user", () => {
    const from = RECEIVED_TAPS[0].profile.id;
    const state = orbitReducer(createInitialState(), { type: "tapProfile", id: from });
    expect(state.sentTaps).toContain(from);
  });

  it("ignores taps on unknown profiles", () => {
    const initial = createInitialState();
    expect(orbitReducer(initial, { type: "tapProfile", id: "nobody" })).toBe(initial);
  });

  it("keeps taps across tab and modal changes", () => {
    let state = orbitReducer(createInitialState(), { type: "tapProfile", id: "p3" });
    state = orbitReducer(state, { type: "openProfile", id: "p4" });
    state = orbitReducer(state, { type: "setTab", tab: "interesse" });
    expect(state.activeTab).toBe("interesse");
    expect(state.sentTaps).toEqual(["p3"]);
  });

  it("restores only known, unique profile ids from storage", () => {
    expect(sanitizeStoredTaps(["p1", "p1", "x", 4, "p2"])).toEqual(["p1", "p2"]);
    expect(sanitizeStoredTaps("p1")).toEqual([]);
    const state = orbitReducer(createInitialState(), { type: "hydrateTaps", ids: ["p5", null] });
    expect(state.sentTaps).toEqual(["p5"]);
  });
});

describe("Mini chat", () => {
  it("opens only for people the user has talked to, alone among modals", () => {
    const initial = orbitReducer(createInitialState(), { type: "openProfile", id: "p4" });
    expect(orbitReducer(initial, { type: "openMiniChat", id: "p48" })).toBe(initial);
    const open = orbitReducer(initial, { type: "openMiniChat", id: "p1", origin: { x: 10, y: 20 } });
    expect(open.miniChat).toEqual({ profileId: "p1", origin: { x: 10, y: 20 } });
    expect(open.selectedProfileId).toBeNull();
    expect(orbitReducer(open, { type: "closeModals" }).miniChat).toBeNull();
    expect(orbitReducer(open, { type: "setTab", tab: "parque" }).miniChat).toBeNull();
  });

  it("replaces the user's balloon and keeps the other side's last line", () => {
    const initial = createInitialState();
    const theirs = initial.conversations.p1.theirs;
    const next = orbitReducer(initial, { type: "recordLine", id: "p1", from: "me", text: "Achei ele!" });
    expect(next.conversations.p1).toEqual({ mine: "Achei ele!", theirs });
  });

  it("starts a conversation from the Parque so the radar can show it", () => {
    const next = orbitReducer(createInitialState(), { type: "recordLine", id: "p4", from: "them", text: "Oi!" });
    expect(next.conversations.p4).toEqual({ mine: null, theirs: "Oi!" });
    expect(orbitReducer(next, { type: "openMiniChat", id: "p4" }).miniChat?.profileId).toBe("p4");
  });
});

describe("sortPosts", () => {
  it("orders by age for Novos and balances score with age for Em alta", () => {
    const posts = createInitialState().posts;
    expect(sortPosts(posts, "new").map((p) => p.ageHours)).toEqual(
      [...posts.map((p) => p.ageHours)].sort((a, b) => a - b),
    );
    const hot = sortPosts(posts, "hot");
    expect(hot[0].id).toBe("c1");
    expect(hot.at(-1)!.id).toBe("c4");
  });
});

describe("Desejos", () => {
  it("começa privado e sem respostas", () => {
    const state = createInitialState();
    expect(state.desejosPublicos).toEqual([]);
    expect(state.desejos).toEqual({ respostas: {}, passo: 0, concluido: false });
    expect(state.desejosTela).toBe("intro");
  });

  it("guarda só respostas válidas e limpa ao pular", () => {
    let state = orbitReducer(createInitialState(), {
      type: "responderDesejo",
      perguntaId: "rapida-carinho",
      resposta: "sim",
    });
    expect(state.desejos.respostas).toEqual({ "rapida-carinho": "sim" });
    expect(orbitReducer(state, { type: "responderDesejo", perguntaId: "rapida-carinho", resposta: 3 })).toBe(state);
    expect(orbitReducer(state, { type: "responderDesejo", perguntaId: "inventada", resposta: "sim" })).toBe(state);
    state = orbitReducer(state, { type: "limparRespostaDesejo", perguntaId: "rapida-carinho" });
    expect(state.desejos.respostas).toEqual({});
  });

  it("mostra desejos no perfil só por opt-in, um por um", () => {
    let state = orbitReducer(createInitialState(), { type: "toggleDesejoPublico", id: "conexao" });
    expect(state.desejosPublicos).toEqual(["conexao"]);
    state = orbitReducer(state, { type: "toggleDesejoPublico", id: "conexao" });
    expect(state.desejosPublicos).toEqual([]);
  });

  it("refaz mantendo as escolhas e apaga tudo quando pedido", () => {
    let state = orbitReducer(createInitialState(), {
      type: "responderDesejo",
      perguntaId: "rapida-caca",
      resposta: "sim",
    });
    state = orbitReducer(state, { type: "toggleDesejoPublico", id: "instinto" });
    state = orbitReducer(state, { type: "concluirDesejos" });
    expect(state.desejosTela).toBe("resultado");
    const refeito = orbitReducer(state, { type: "refazerDesejos" });
    expect(refeito.desejos).toEqual({ respostas: {}, passo: 0, concluido: false });
    expect(refeito.desejosTela).toBe("quiz");
    const apagado = orbitReducer(state, { type: "apagarDesejos" });
    expect(apagado.desejosPublicos).toEqual([]);
    expect(apagado.desejos.respostas).toEqual({});
  });

  it("abre a ficha do tema fechando os outros modais", () => {
    const opened = orbitReducer(createInitialState(), { type: "openProfile", id: "p1" });
    const ficha = orbitReducer(opened, { type: "abrirDesejo", id: "olhar" });
    expect(ficha.selectedProfileId).toBeNull();
    expect(ficha.desejoAberto).toBe("olhar");
    expect(orbitReducer(ficha, { type: "closeModals" }).desejoAberto).toBeNull();
  });

  it("restaura o estado salvo e abre no resultado quando concluído", () => {
    const state = orbitReducer(createInitialState(), {
      type: "hydrateDesejos",
      estado: { respostas: { "rapida-caca": "sim" }, passo: 3, concluido: true, publicos: ["instinto"] },
    });
    expect(state.desejosTela).toBe("resultado");
    expect(state.desejosPublicos).toEqual(["instinto"]);
    expect(state.desejos.passo).toBe(3);
  });
});
