import { CATEGORIA_LIST, isCategoriaId } from "./categorias";
import { NENHUMA, PERGUNTAS } from "./perguntas";
import type {
  CategoriaId,
  EstadoDesejos,
  NivelIntensidade,
  Pergunta,
  Resposta,
  RespostaRapida,
  Respostas,
  ResultadoCategoria,
} from "./types";

const VALOR_RAPIDA: Record<RespostaRapida, number> = { sim: 2, talvez: 1, nao: 0 };
const VALOR_CENA = 2;
const MAXIMO: Record<Pergunta["tipo"], number> = { cenas: VALOR_CENA, intensidade: 3, rapida: 2 };

/** A category needs at least this many answered questions before it shows a percentage. */
export const MINIMO_RESPONDIDAS = 2;

export function respostaValida(pergunta: Pergunta, resposta: unknown): resposta is Resposta {
  switch (pergunta.tipo) {
    case "cenas":
      return resposta === NENHUMA || (typeof resposta === "string" && pergunta.opcoes.some((o) => o.id === resposta));
    case "intensidade":
      return resposta === 0 || resposta === 1 || resposta === 2 || resposta === 3;
    case "rapida":
      return typeof resposta === "string" && Object.hasOwn(VALOR_RAPIDA, resposta);
  }
}

/** Categories a question can feed, whatever the answer. */
export function categoriasDaPergunta(pergunta: Pergunta): CategoriaId[] {
  if (pergunta.tipo !== "cenas") return pergunta.categorias;
  return [...new Set(pergunta.opcoes.flatMap((o) => o.categorias))];
}

/** Integer weight (0–3) one answer gives to each category it feeds. */
export function pesosDaResposta(pergunta: Pergunta, resposta: Resposta): Partial<Record<CategoriaId, number>> {
  switch (pergunta.tipo) {
    case "cenas": {
      const opcao = pergunta.opcoes.find((o) => o.id === resposta);
      return Object.fromEntries(
        categoriasDaPergunta(pergunta).map((id) => [id, opcao?.categorias.includes(id) ? VALOR_CENA : 0]),
      );
    }
    case "intensidade":
      return Object.fromEntries(pergunta.categorias.map((id) => [id, resposta as NivelIntensidade]));
    case "rapida":
      return Object.fromEntries(pergunta.categorias.map((id) => [id, VALOR_RAPIDA[resposta as RespostaRapida]]));
  }
}

function respostaZero(pergunta: Pergunta): Resposta {
  if (pergunta.tipo === "cenas") return NENHUMA;
  return pergunta.tipo === "intensidade" ? 0 : "nao";
}

/** Themes closed by a "nada" on their filter question. */
function temasFechados(respostas: Respostas, perguntas: Pergunta[]) {
  return new Set(perguntas.filter((p) => p.filtro && respostas[p.id] === 0).map((p) => p.filtro));
}

/** True when the branching skips this question for the current answers. */
export function perguntaPulada(pergunta: Pergunta, respostas: Respostas, perguntas: Pergunta[] = PERGUNTAS): boolean {
  return Boolean(pergunta.aprofunda && temasFechados(respostas, perguntas).has(pergunta.aprofunda));
}

/** Answers with the branching applied: questions skipped by a closed theme count as 0. */
export function respostasEfetivas(respostas: Respostas, perguntas: Pergunta[] = PERGUNTAS): Respostas {
  const fechados = temasFechados(respostas, perguntas);
  const efetivas: Respostas = {};
  for (const pergunta of perguntas) {
    if (pergunta.aprofunda && fechados.has(pergunta.aprofunda)) efetivas[pergunta.id] = respostaZero(pergunta);
    else if (respostaValida(pergunta, respostas[pergunta.id])) efetivas[pergunta.id] = respostas[pergunta.id];
  }
  return efetivas;
}

/**
 * percentual = round(100 × pesos obtidos / máximo possível nas perguntas respondidas).
 * Skipped questions leave the denominator, so skipping never lowers a score. Categories
 * are independent (they don't add up to 100%) and need MINIMO_RESPONDIDAS answers.
 */
export function pontuar(respostas: Respostas, perguntas: Pergunta[] = PERGUNTAS): ResultadoCategoria[] {
  const efetivas = respostasEfetivas(respostas, perguntas);
  const obtido = new Map<CategoriaId, number>();
  const maximo = new Map<CategoriaId, number>();
  const respondidas = new Map<CategoriaId, number>();
  for (const pergunta of perguntas) {
    const resposta = efetivas[pergunta.id];
    if (resposta === undefined) continue;
    for (const [id, peso] of Object.entries(pesosDaResposta(pergunta, resposta)) as [CategoriaId, number][]) {
      obtido.set(id, (obtido.get(id) ?? 0) + peso);
      maximo.set(id, (maximo.get(id) ?? 0) + MAXIMO[pergunta.tipo]);
      respondidas.set(id, (respondidas.get(id) ?? 0) + 1);
    }
  }
  return CATEGORIA_LIST.map(({ id }) => {
    const n = respondidas.get(id) ?? 0;
    const max = maximo.get(id) ?? 0;
    const pct = n >= MINIMO_RESPONDIDAS && max > 0 ? Math.round((100 * (obtido.get(id) ?? 0)) / max) : null;
    return { id, pct, respondidas: n };
  });
}

/** Measured categories first, highest first; ties keep the glossary order. */
export function resultadoOrdenado(respostas: Respostas, perguntas: Pergunta[] = PERGUNTAS): ResultadoCategoria[] {
  const resultado = pontuar(respostas, perguntas);
  return [...resultado].sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));
}

export function contarRespondidas(respostas: Respostas, perguntas: Pergunta[] = PERGUNTAS): number {
  return perguntas.filter((p) => respostaValida(p, respostas[p.id])).length;
}

/** Next question index after `passo`, skipping the ones the branching closed; `perguntas.length` means done. */
export function proximoPasso(passo: number, respostas: Respostas, perguntas: Pergunta[] = PERGUNTAS): number {
  let next = passo + 1;
  while (next < perguntas.length && perguntaPulada(perguntas[next], respostas, perguntas)) next++;
  return next;
}

export function passoAnterior(passo: number, respostas: Respostas, perguntas: Pergunta[] = PERGUNTAS): number {
  let prev = passo - 1;
  while (prev > 0 && perguntaPulada(perguntas[prev], respostas, perguntas)) prev--;
  return Math.max(0, prev);
}

export const ESTADO_DESEJOS_VAZIO: EstadoDesejos = { respostas: {}, passo: 0, concluido: false, publicos: [] };

/** Drops unknown questions, invalid answers and categories from a stored payload. */
export function sanitizarDesejos(raw: unknown, perguntas: Pergunta[] = PERGUNTAS): EstadoDesejos {
  if (typeof raw !== "object" || raw === null) return structuredClone(ESTADO_DESEJOS_VAZIO);
  const data = raw as Record<string, unknown>;
  const stored =
    typeof data.respostas === "object" && data.respostas !== null ? (data.respostas as Record<string, unknown>) : {};
  const respostas: Respostas = {};
  for (const pergunta of perguntas) {
    const resposta = stored[pergunta.id];
    if (respostaValida(pergunta, resposta)) respostas[pergunta.id] = resposta;
  }
  const passo =
    typeof data.passo === "number" && Number.isInteger(data.passo)
      ? Math.min(Math.max(data.passo, 0), perguntas.length - 1)
      : 0;
  const publicos = Array.isArray(data.publicos) ? [...new Set(data.publicos.filter(isCategoriaId))] : [];
  return { respostas, passo, concluido: data.concluido === true, publicos };
}
