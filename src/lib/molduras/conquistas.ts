import type { Conversations } from "@/lib/conversas";
import { findCityRoom } from "@/lib/data/parkRooms";
import type { CommunityPost } from "@/lib/types";
import { MOLDURAS, type ConquistaId, type Moldura, type MolduraId } from "./catalogo";
import { ORBIT_PLUS, type OrbitPlusModo } from "./config";

/** The slice of app state achievements read; everything is local activity in the demo. */
export interface ContextoConquistas {
  foundPacoca: boolean;
  conversations: Conversations;
  posts: readonly CommunityPost[];
  desejosConcluido: boolean;
  sentTaps: readonly string[];
  topicos: number;
  parkRoomId: string | null;
  desbloqueadas: readonly MolduraId[];
}

interface Conquista {
  titulo: string;
  meta: number;
  atual: (ctx: ContextoConquistas) => number;
}

const MOLDURAS_DE_CONQUISTA = MOLDURAS.filter((m) => m.desbloqueio.tipo !== "orbitPlus");
const ehDeConquista = new Set(MOLDURAS_DE_CONQUISTA.map((m) => m.id));

export const CONQUISTAS: Record<ConquistaId, Conquista> = {
  toques: { titulo: "Dê 3 toques em pessoas da Órbita", meta: 3, atual: (c) => c.sentTaps.length },
  curioso: { titulo: "Marque 6 assuntos no seu Hub", meta: 6, atual: (c) => c.topicos },
  pacoca: { titulo: "Ache o gato Paçoca no Parque Central", meta: 1, atual: (c) => Number(c.foundPacoca) },
  papo: {
    titulo: "Troque falas com 5 pessoas (os dois lados falaram)",
    meta: 5,
    atual: (c) => Object.values(c.conversations).filter((v) => v.mine.length > 0 && v.theirs.length > 0).length,
  },
  comunidade: {
    titulo: "Comente ou publique na Comunidade",
    meta: 1,
    // Seed threads may already be the user's; only what was written in this app counts.
    atual: (c) =>
      Number(c.posts.some((p) => (p.authorProfileId === "me" && p.ageHours === 0) || p.comments.some((m) => m.local))),
  },
  viajante: {
    titulo: "Entre numa sala do Parque pelo mundo",
    meta: 1,
    atual: (c) => Number(Boolean(findCityRoom(c.parkRoomId))),
  },
  desejos: { titulo: "Conclua o quiz de Desejos", meta: 1, atual: (c) => Number(c.desejosConcluido) },
  colecionador: {
    titulo: "Tenha 6 molduras de conquista",
    meta: 6,
    atual: (c) => c.desbloqueadas.filter((id) => ehDeConquista.has(id)).length,
  },
  lenda: {
    titulo: `Tenha todas as ${MOLDURAS_DE_CONQUISTA.length} molduras de conquista`,
    meta: MOLDURAS_DE_CONQUISTA.length,
    atual: (c) => c.desbloqueadas.filter((id) => ehDeConquista.has(id)).length,
  },
};

export function progresso(id: ConquistaId, ctx: ContextoConquistas): { atual: number; meta: number; feito: boolean } {
  const { meta, atual } = CONQUISTAS[id];
  const valor = Math.min(meta, atual(ctx));
  return { atual: valor, meta, feito: valor >= meta };
}

/** The achievement that unlocks a frame under the current monetization mode, if any. */
export function conquistaDe(m: Moldura, modo: OrbitPlusModo = ORBIT_PLUS.modo): ConquistaId | null {
  if (m.desbloqueio.tipo === "conquista") return m.desbloqueio.conquista;
  if (m.desbloqueio.tipo === "orbitPlus" && modo === "conquista") return m.desbloqueio.conquistaAlternativa;
  return null;
}

export function molduraVisivel(m: Moldura, modo: OrbitPlusModo = ORBIT_PLUS.modo): boolean {
  return m.desbloqueio.tipo !== "orbitPlus" || modo !== "desligado";
}

/** Frames earned by activity and not unlocked yet; achievement frames first, so collector goals see them. */
export function novasDesbloqueadas(ctx: ContextoConquistas, modo: OrbitPlusModo = ORBIT_PLUS.modo): MolduraId[] {
  const ganhas: MolduraId[] = [];
  let atual = ctx;
  for (const grupo of [MOLDURAS_DE_CONQUISTA, MOLDURAS.filter((m) => m.desbloqueio.tipo === "orbitPlus")]) {
    for (const m of grupo) {
      if (atual.desbloqueadas.includes(m.id) || !molduraVisivel(m, modo)) continue;
      const conquista = conquistaDe(m, modo);
      const inicial = m.desbloqueio.tipo === "inicial";
      if (inicial || (conquista && progresso(conquista, atual).feito)) ganhas.push(m.id);
    }
    atual = { ...ctx, desbloqueadas: [...ctx.desbloqueadas, ...ganhas] };
  }
  return ganhas;
}
