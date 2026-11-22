import type { CategoriaId } from "./types";

export interface DesejoPublico {
  id: CategoriaId;
  pct: number;
}

/** Desires a few simulated profiles chose to show; every other profile keeps them private. */
export const DESEJOS_SIMULADOS: Record<string, DesejoPublico[]> = {
  p1: [
    { id: "baunilha", pct: 88 },
    { id: "sensorial", pct: 64 },
  ],
  p2: [
    { id: "switch", pct: 81 },
    { id: "roleplay", pct: 70 },
    { id: "experimental", pct: 55 },
  ],
  p4: [{ id: "dominante", pct: 76 }],
  p5: [
    { id: "brat", pct: 92 },
    { id: "submisso", pct: 61 },
  ],
  p7: [
    { id: "nao-monogamia", pct: 84 },
    { id: "experimental", pct: 72 },
  ],
  p9: [
    { id: "materiais", pct: 79 },
    { id: "amarracao", pct: 58 },
  ],
  p12: [{ id: "baunilha", pct: 95 }],
  p15: [
    { id: "primal", pct: 74 },
    { id: "switch", pct: 66 },
  ],
  p20: [
    { id: "sensorial", pct: 83 },
    { id: "voyeur", pct: 47 },
  ],
};

export function desejosPublicosDe(profileId: string): DesejoPublico[] {
  return DESEJOS_SIMULADOS[profileId] ?? [];
}
