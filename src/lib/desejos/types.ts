export type CategoriaId =
  | "baunilha"
  | "sensorial"
  | "voyeur"
  | "exibicionista"
  | "dominante"
  | "submisso"
  | "switch"
  | "amarracao"
  | "sadista"
  | "masoquista"
  | "brat"
  | "primal"
  | "roleplay"
  | "materiais"
  | "nao-monogamia"
  | "experimental";

export type IlustracaoId =
  | "jantar"
  | "pena"
  | "janela"
  | "palco"
  | "coroa"
  | "chave"
  | "setas"
  | "corda"
  | "pimenta"
  | "rosa"
  | "aviao"
  | "floresta"
  | "mascaras"
  | "couro"
  | "coracoes"
  | "mapa";

export interface MitoEFato {
  mito: string;
  fato: string;
}

export interface Referencia {
  titulo: string;
  url?: string;
}

export type FamiliaId = "conexao" | "exploracao" | "olhar" | "sensacoes" | "poder" | "fantasia";

/** Glossary entry; the text fields mirror `internal/desejos/conteudo.json` from the research. */
export interface CategoriaDesejo {
  id: CategoriaId;
  familia: FamiliaId;
  nome: string;
  /** The common (often English) term, shown only as a name. */
  nomeOriginal: string;
  ilustracao: IlustracaoId;
  resumo: string;
  oQueE: string;
  mitosEFatos: MitoEFato[];
  comoExplorarComConsentimento: string;
  referencias: Referencia[];
}

export interface OpcaoCena {
  id: string;
  rotulo: string;
  ilustracao: IlustracaoId;
  /** 1 to 3 categories the scene feeds. */
  categorias: CategoriaId[];
}

/** Theme a filter question opens; "nada" on it skips the questions that go deeper into it. */
export type TemaRamificacao = "poder";

interface PerguntaBase {
  id: string;
  enunciado: string;
  filtro?: TemaRamificacao;
  aprofunda?: TemaRamificacao;
}

export type Pergunta =
  | (PerguntaBase & { tipo: "cenas"; opcoes: OpcaoCena[] })
  | (PerguntaBase & { tipo: "intensidade"; ilustracao: IlustracaoId; categorias: CategoriaId[] })
  | (PerguntaBase & { tipo: "rapida"; categorias: CategoriaId[] });

export type RespostaRapida = "sim" | "talvez" | "nao";
/** 0 nada · 1 curiosidade · 2 curto · 3 adoro */
export type NivelIntensidade = 0 | 1 | 2 | 3;

/** Scene option id (or "nenhuma"), intensity level or quick answer, depending on the question type. */
export type Resposta = string | NivelIntensidade | RespostaRapida;

export type Respostas = Record<string, Resposta>;

export interface ProgressoDesejos {
  respostas: Respostas;
  /** Index of the question on screen, so the quiz resumes where it stopped. */
  passo: number;
  concluido: boolean;
}

/** What `orbit:desejos:v1` stores. */
export interface EstadoDesejos extends ProgressoDesejos {
  /** Categories the person chose to show on the profile. Empty by default. */
  publicos: CategoriaId[];
}

export interface ResultadoCategoria {
  id: CategoriaId;
  /** 0–100, or null when fewer than two answered questions measured the category. */
  pct: number | null;
  respondidas: number;
}
