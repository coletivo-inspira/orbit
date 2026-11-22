import { describe, expect, it } from "vitest";
import { createInitialState, orbitReducer } from "@/lib/state/reducer";
import { getMoldura, MOLDURAS, MOLDURAS_INICIAIS } from "./catalogo";
import { molduraVisivel, novasDesbloqueadas, progresso, type ContextoConquistas } from "./conquistas";
import { ORBIT_PLUS } from "./config";
import { sanitizarMolduras } from "./estado";

const base: ContextoConquistas = {
  foundPacoca: false,
  conversations: {},
  posts: [],
  desejosConcluido: false,
  sentTaps: [],
  topicos: 0,
  parkRoomId: null,
  desbloqueadas: MOLDURAS_INICIAIS,
};

const plusIds = MOLDURAS.filter((m) => m.desbloqueio.tipo === "orbitPlus").map((m) => m.id);

describe("catálogo", () => {
  it("has starter frames, achievement frames and a few Orbit+ ones", () => {
    expect(MOLDURAS_INICIAIS).toContain("classica");
    expect(plusIds.length).toBeGreaterThan(0);
    expect(plusIds.length).toBeLessThan(MOLDURAS.length / 2);
    expect(new Set(MOLDURAS.map((m) => m.id)).size).toBe(MOLDURAS.length);
  });
});

describe("conquistas", () => {
  it("unlocks nothing new without activity", () => {
    expect(novasDesbloqueadas(base, "simulado")).toEqual([]);
  });

  it("tracks progress and unlocks when the goal is met", () => {
    expect(progresso("toques", { ...base, sentTaps: ["p1", "p2"] })).toEqual({ atual: 2, meta: 3, feito: false });
    expect(novasDesbloqueadas({ ...base, sentTaps: ["p1", "p2", "p3"], foundPacoca: true }, "simulado")).toEqual([
      "toques",
      "pacoca",
    ]);
  });

  it("only counts city rooms and comments written in the app", () => {
    expect(progresso("viajante", { ...base, parkRoomId: "paris-torre-eiffel" }).feito).toBe(true);
    expect(progresso("viajante", { ...base, parkRoomId: "inexistente" }).feito).toBe(false);
    const seeded = createInitialState().posts;
    expect(progresso("comunidade", { ...base, posts: seeded }).feito).toBe(false);
  });

  it("never unlocks Orbit+ by activity while it is a simulated purchase", () => {
    const tudo = { ...base, desbloqueadas: MOLDURAS.filter((m) => !plusIds.includes(m.id)).map((m) => m.id) };
    expect(novasDesbloqueadas(tudo, "simulado")).toEqual([]);
  });

  it("turns Orbit+ into achievements when monetization is off", () => {
    const tudo = { ...base, desbloqueadas: MOLDURAS.filter((m) => !plusIds.includes(m.id)).map((m) => m.id) };
    expect(novasDesbloqueadas(tudo, "conquista").sort()).toEqual([...plusIds].sort());
  });

  it("hides Orbit+ when it is switched off", () => {
    expect(plusIds.every((id) => !molduraVisivel(getMoldura(id), "desligado"))).toBe(true);
  });
});

describe("sanitizarMolduras", () => {
  it("rejects garbage and keeps only known, unique ids plus the starters", () => {
    expect(sanitizarMolduras(null)).toBeNull();
    expect(sanitizarMolduras({ ativa: "hack", desbloqueadas: ["pacoca", "pacoca", "x", 3] }, "simulado")).toEqual({
      ativa: "classica",
      desbloqueadas: [...MOLDURAS_INICIAIS, "pacoca"],
    });
  });

  it("falls back to the default frame when the active one is not unlocked", () => {
    expect(sanitizarMolduras({ ativa: "galaxia", desbloqueadas: [] }, "simulado")?.ativa).toBe("classica");
    expect(sanitizarMolduras({ ativa: "pacoca", desbloqueadas: ["pacoca"] }, "simulado")?.ativa).toBe("pacoca");
  });

  it("drops Orbit+ frames when Orbit+ is off", () => {
    const saved = { ativa: "cometa", desbloqueadas: ["cometa"] };
    expect(sanitizarMolduras(saved, "desligado")).toEqual({ ativa: "classica", desbloqueadas: MOLDURAS_INICIAIS });
  });
});

describe("reducer", () => {
  it("starts with the starter frames and the classic one in use", () => {
    const { molduras } = createInitialState();
    expect(molduras.ativa).toBe("classica");
    expect(molduras.desbloqueadas).toEqual(MOLDURAS_INICIAIS);
  });

  it("unlocks a frame from activity and only lets the user wear unlocked ones", () => {
    let state = createInitialState();
    expect(orbitReducer(state, { type: "usarMoldura", id: "pacoca" })).toBe(state);
    state = orbitReducer(state, { type: "foundPacoca" });
    expect(state.molduras.desbloqueadas).toContain("pacoca");
    state = orbitReducer(state, { type: "usarMoldura", id: "pacoca" });
    expect(state.molduras.ativa).toBe("pacoca");
  });

  it("keeps an earned frame after the activity that earned it is gone", () => {
    let state = orbitReducer(createInitialState(), { type: "enterParkRoom", id: "rio-pao-de-acucar" });
    state = orbitReducer(state, { type: "leaveParkRoom" });
    expect(state.molduras.desbloqueadas).toContain("viajante");
  });

  it("simulates the Orbit+ unlock only for Orbit+ frames", () => {
    const initial = createInitialState();
    expect(orbitReducer(initial, { type: "desbloquearOrbitPlus", id: "pacoca" })).toBe(initial);
    const next = orbitReducer(initial, { type: "desbloquearOrbitPlus", id: "cometa" });
    if (ORBIT_PLUS.modo === "simulado") {
      expect(next.molduras).toMatchObject({ ativa: "cometa" });
      expect(next.molduras.desbloqueadas).toContain("cometa");
    } else {
      expect(next).toBe(initial);
    }
  });

  it("merges stored frames with what the session already earned", () => {
    let state = orbitReducer(createInitialState(), { type: "foundPacoca" });
    state = orbitReducer(state, {
      type: "hydrateMolduras",
      estado: { ativa: "desejos", desbloqueadas: [...MOLDURAS_INICIAIS, "desejos"] },
    });
    expect(state.molduras.desbloqueadas).toEqual(expect.arrayContaining(["pacoca", "desejos"]));
    expect(state.molduras.ativa).toBe("desejos");
  });
});
