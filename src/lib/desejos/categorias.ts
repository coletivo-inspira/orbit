import conteudo from "./conteudo.json";
import type { CategoriaDesejo, CategoriaId, FamiliaId, IlustracaoId } from "./types";

export const FAMILIAS: Record<FamiliaId, string> = {
  conexao: "Conexão e intimidade",
  exploracao: "Exploração",
  olhar: "Olhar e ser visto",
  sensacoes: "Sensações",
  poder: "Poder e papéis",
  fantasia: "Fantasia e encenação",
};

const ILUSTRACOES: Record<CategoriaId, IlustracaoId> = {
  conexao: "jantar",
  exploracao: "mapa",
  olhar: "janela",
  "ser-visto": "palco",
  conduzir: "coroa",
  entregar: "chave",
  alternar: "setas",
  cordas: "corda",
  "sensacoes-dar": "pimenta",
  "sensacoes-receber": "rosa",
  provocacao: "aviao",
  cuidado: "caneca",
  instinto: "floresta",
  "relacoes-abertas": "coracoes",
  encenacao: "mascaras",
  texturas: "couro",
};

/** Glossary text from the research (`internal/desejos/conteudo.json`), in its order. */
export const CATEGORIA_LIST: CategoriaDesejo[] = conteudo.map((c) => ({
  ...c,
  id: c.id as CategoriaId,
  familia: c.familia as FamiliaId,
  ilustracao: ILUSTRACOES[c.id as CategoriaId],
}));

export const CATEGORIAS = Object.fromEntries(CATEGORIA_LIST.map((c) => [c.id, c])) as Record<
  CategoriaId,
  CategoriaDesejo
>;

export const CATEGORIA_IDS: ReadonlySet<string> = new Set(Object.keys(ILUSTRACOES));

export function isCategoriaId(value: unknown): value is CategoriaId {
  return typeof value === "string" && CATEGORIA_IDS.has(value);
}
