import type { CategoriaDesejo, CategoriaId, FamiliaId } from "./types";

const EM_PRODUCAO = "Texto provisório: a explicação completa chega com a pesquisa da equipe.";

export const FAMILIAS: Record<FamiliaId, string> = {
  conexao: "Conexão e intimidade",
  exploracao: "Exploração",
  olhar: "Olhar e ser visto",
  sensacoes: "Sensações",
  poder: "Poder e papéis",
  fantasia: "Fantasia e encenação",
};

function provisoria(
  id: CategoriaId,
  familia: FamiliaId,
  nome: string,
  nomeOriginal: string,
  ilustracao: CategoriaDesejo["ilustracao"],
  resumo: string,
): CategoriaDesejo {
  return {
    id,
    familia,
    nome,
    nomeOriginal,
    ilustracao,
    resumo,
    oQueE: EM_PRODUCAO,
    mitosEFatos: [],
    comoExplorarComConsentimento: EM_PRODUCAO,
    referencias: [],
  };
}

export const CATEGORIA_LIST: CategoriaDesejo[] = [
  provisoria(
    "baunilha",
    "conexao",
    "Baunilha",
    "Vanilla",
    "jantar",
    "Conexão, carinho e intimidade sem roteiro de jogo.",
  ),
  provisoria(
    "nao-monogamia",
    "conexao",
    "Não monogamia",
    "Non-monogamy",
    "coracoes",
    "Vínculos com mais de uma pessoa, com acordos claros.",
  ),
  provisoria(
    "experimental",
    "exploracao",
    "Experimental",
    "Experimentalist",
    "mapa",
    "Curiosidade de explorar o novo, sem pressa de se definir.",
  ),
  provisoria(
    "materiais",
    "exploracao",
    "Materiais e texturas",
    "Fetish",
    "couro",
    "Atração por couro, látex, seda e outros materiais.",
  ),
  provisoria(
    "voyeur",
    "olhar",
    "Voyeur",
    "Voyeur",
    "janela",
    "Prazer em observar, com o consentimento de quem é visto.",
  ),
  provisoria(
    "exibicionista",
    "olhar",
    "Exibicionista",
    "Exhibitionist",
    "palco",
    "Prazer em ser visto por quem topou ver.",
  ),
  provisoria(
    "sensorial",
    "sensacoes",
    "Sensorial",
    "Sensation play",
    "pena",
    "Texturas, temperatura e toques que despertam os sentidos.",
  ),
  provisoria(
    "sadista",
    "sensacoes",
    "Sadismo consensual",
    "Sadist",
    "pimenta",
    "Provocar sensações intensas em quem pediu por elas.",
  ),
  provisoria(
    "masoquista",
    "sensacoes",
    "Masoquismo consensual",
    "Masochist",
    "rosa",
    "Prazer em sensações intensas combinadas antes.",
  ),
  provisoria("dominante", "poder", "Dominação", "Dominant", "coroa", "Conduzir o ritmo e combinar as regras do jogo."),
  provisoria("submisso", "poder", "Submissão", "Submissive", "chave", "Entregar a condução a alguém de confiança."),
  provisoria(
    "switch",
    "poder",
    "Switch",
    "Switch",
    "setas",
    "Alternar entre conduzir e deixar conduzir, conforme o momento.",
  ),
  provisoria("brat", "poder", "Brat", "Brat", "aviao", "Provocar e desafiar de brincadeira para ver a reação."),
  provisoria(
    "amarracao",
    "poder",
    "Amarração",
    "Bondage",
    "corda",
    "Cordas e restrições combinadas, com foco em confiança.",
  ),
  provisoria("roleplay", "fantasia", "Encenação", "Roleplay", "mascaras", "Criar personagens e histórias juntos."),
  provisoria("primal", "fantasia", "Primal", "Primal", "floresta", "Energia física e instintiva, como caça e caçador."),
];

export const CATEGORIAS = Object.fromEntries(CATEGORIA_LIST.map((c) => [c.id, c])) as Record<
  CategoriaId,
  CategoriaDesejo
>;

export const CATEGORIA_IDS: ReadonlySet<string> = new Set(CATEGORIA_LIST.map((c) => c.id));

export function isCategoriaId(value: unknown): value is CategoriaId {
  return typeof value === "string" && CATEGORIA_IDS.has(value);
}
