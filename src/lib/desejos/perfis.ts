import type { CategoriaId } from "./types";

export interface DesejoPublico {
  id: CategoriaId;
  pct: number;
}

/** Desires a few simulated profiles chose to show; every other profile keeps them private. */
export const DESEJOS_SIMULADOS: Record<string, DesejoPublico[]> = {
  p1: [
    { id: "conexao", pct: 88 },
    { id: "cuidado", pct: 64 },
  ],
  p2: [
    { id: "alternar", pct: 81 },
    { id: "encenacao", pct: 70 },
    { id: "exploracao", pct: 55 },
  ],
  p4: [{ id: "conduzir", pct: 76 }],
  p5: [
    { id: "provocacao", pct: 92 },
    { id: "entregar", pct: 61 },
  ],
  p7: [
    { id: "relacoes-abertas", pct: 84 },
    { id: "exploracao", pct: 72 },
  ],
  p9: [
    { id: "texturas", pct: 79 },
    { id: "cordas", pct: 58 },
  ],
  p12: [{ id: "conexao", pct: 95 }],
  p15: [
    { id: "instinto", pct: 74 },
    { id: "alternar", pct: 66 },
  ],
  p20: [
    { id: "cuidado", pct: 83 },
    { id: "olhar", pct: 47 },
  ],
};

export function desejosPublicosDe(profileId: string): DesejoPublico[] {
  return DESEJOS_SIMULADOS[profileId] ?? [];
}
