import type { Pergunta } from "./types";

/** Left to right in increasing order, equal spacing, no level highlighted by color. */
export const NIVEIS_INTENSIDADE = ["nada", "curiosidade", "curto", "adoro"] as const;

export const RESPOSTAS_RAPIDAS = [
  { id: "sim", rotulo: "Sim" },
  { id: "talvez", rotulo: "Talvez" },
  { id: "nao", rotulo: "Não" },
] as const;

/** Every scene question also accepts this answer: it counts as answered and gives 0. */
export const NENHUMA = "nenhuma";

/**
 * Fixed order in blocks: connection first, then exploration, the senses and settings,
 * then fantasy, and power and intensity last.
 */
export const PERGUNTAS: Pergunta[] = [
  {
    id: "cena-conexao",
    tipo: "cenas",
    enunciado: "Qual dessas cenas te atrai mais?",
    opcoes: [
      { id: "jantar", rotulo: "Um jantar à luz de velas", ilustracao: "jantar", categorias: ["baunilha"] },
      {
        id: "coracoes",
        rotulo: "Um encontro com mais gente, com acordos",
        ilustracao: "coracoes",
        categorias: ["nao-monogamia"],
      },
      { id: "mapa", rotulo: "Uma viagem sem roteiro", ilustracao: "mapa", categorias: ["experimental"] },
    ],
  },
  {
    id: "rapida-carinho",
    tipo: "rapida",
    enunciado: "Carinho, beijo demorado e conversa bastam para uma noite ótima?",
    categorias: ["baunilha"],
  },
  {
    id: "intensidade-vinculos",
    tipo: "intensidade",
    enunciado: "Ter mais de um vínculo afetivo ao mesmo tempo, com todo mundo sabendo.",
    ilustracao: "coracoes",
    categorias: ["nao-monogamia"],
  },
  {
    id: "rapida-acordos",
    tipo: "rapida",
    enunciado: "Uma relação aberta, com acordos claros, faz sentido para você?",
    categorias: ["nao-monogamia"],
  },
  {
    id: "cena-objeto",
    tipo: "cenas",
    enunciado: "Qual destes objetos desperta mais a sua curiosidade?",
    opcoes: [
      { id: "pena", rotulo: "Uma venda e uma pena", ilustracao: "pena", categorias: ["sensorial"] },
      { id: "couro", rotulo: "Luvas e botas de couro", ilustracao: "couro", categorias: ["materiais"] },
      { id: "mapa", rotulo: "Um mapa de lugares novos", ilustracao: "mapa", categorias: ["experimental"] },
      { id: "corda", rotulo: "Uma corda macia enrolada", ilustracao: "corda", categorias: ["amarracao"] },
    ],
  },
  {
    id: "intensidade-sentidos",
    tipo: "intensidade",
    enunciado: "Venda nos olhos, temperatura e toques leves.",
    ilustracao: "pena",
    categorias: ["sensorial"],
  },
  {
    id: "rapida-materiais",
    tipo: "rapida",
    enunciado: "Couro, látex ou seda mexem com você?",
    categorias: ["materiais"],
  },
  {
    id: "cena-ambiente",
    tipo: "cenas",
    enunciado: "Qual ambiente parece mais convidativo?",
    opcoes: [
      { id: "janela", rotulo: "Uma varanda com vista para a cidade", ilustracao: "janela", categorias: ["voyeur"] },
      { id: "palco", rotulo: "Uma pista sob o holofote", ilustracao: "palco", categorias: ["exibicionista"] },
      { id: "couro", rotulo: "Um clube de couro", ilustracao: "couro", categorias: ["materiais"] },
    ],
  },
  {
    id: "intensidade-observar",
    tipo: "intensidade",
    enunciado: "Observar de longe um casal flertando, com o consentimento de todo mundo.",
    ilustracao: "janela",
    categorias: ["voyeur"],
  },
  {
    id: "intensidade-ser-visto",
    tipo: "intensidade",
    enunciado: "Saber que alguém te admira de longe, com o seu consentimento.",
    ilustracao: "palco",
    categorias: ["exibicionista"],
  },
  {
    id: "cena-olhar",
    tipo: "cenas",
    enunciado: "E agora, qual dessas cenas te atrai mais?",
    opcoes: [
      { id: "janela", rotulo: "Uma janela acesa do outro lado da rua", ilustracao: "janela", categorias: ["voyeur"] },
      { id: "palco", rotulo: "Dançar sabendo que estão olhando", ilustracao: "palco", categorias: ["exibicionista"] },
      { id: "pena", rotulo: "Toques leves de olhos vendados", ilustracao: "pena", categorias: ["sensorial"] },
      { id: "jantar", rotulo: "Uma noite tranquila a dois", ilustracao: "jantar", categorias: ["baunilha"] },
    ],
  },
  {
    id: "cena-cenario",
    tipo: "cenas",
    enunciado: "Para uma noite diferente, qual cenário chama você?",
    opcoes: [
      { id: "mascaras", rotulo: "Máscaras e personagens", ilustracao: "mascaras", categorias: ["roleplay"] },
      { id: "floresta", rotulo: "Uma floresta sob a lua", ilustracao: "floresta", categorias: ["primal"] },
      { id: "mapa", rotulo: "Um lugar onde você nunca foi", ilustracao: "mapa", categorias: ["experimental"] },
    ],
  },
  {
    id: "intensidade-personagens",
    tipo: "intensidade",
    enunciado: "Interpretar personagens e inventar uma história juntos.",
    ilustracao: "mascaras",
    categorias: ["roleplay"],
  },
  {
    id: "rapida-caca",
    tipo: "rapida",
    enunciado: "Brincar de caça e caçador, com muita energia física, te anima?",
    categorias: ["primal"],
  },
  {
    id: "cena-convite",
    tipo: "cenas",
    enunciado: "Que convite você aceitaria primeiro?",
    opcoes: [
      { id: "mascaras", rotulo: "Um baile de máscaras", ilustracao: "mascaras", categorias: ["roleplay"] },
      { id: "floresta", rotulo: "Uma trilha noturna", ilustracao: "floresta", categorias: ["primal"] },
      {
        id: "coracoes",
        rotulo: "Uma festa entre pessoas queridas",
        ilustracao: "coracoes",
        categorias: ["nao-monogamia"],
      },
      {
        id: "pimenta",
        rotulo: "Uma noite bem apimentada",
        ilustracao: "pimenta",
        categorias: ["sadista", "masoquista"],
      },
    ],
  },
  {
    id: "intensidade-poder",
    tipo: "intensidade",
    enunciado: "Jogos em que uma pessoa conduz e a outra segue, combinados antes.",
    ilustracao: "coroa",
    categorias: ["dominante", "submisso", "switch"],
    filtro: "poder",
  },
  {
    id: "cena-papel",
    tipo: "cenas",
    enunciado: "Num jogo combinado, qual papel combina mais com você?",
    aprofunda: "poder",
    opcoes: [
      { id: "coroa", rotulo: "Quem dita as regras", ilustracao: "coroa", categorias: ["dominante"] },
      { id: "chave", rotulo: "Quem entrega a chave", ilustracao: "chave", categorias: ["submisso"] },
      { id: "setas", rotulo: "Depende do dia", ilustracao: "setas", categorias: ["switch"] },
      { id: "aviao", rotulo: "Quem provoca de brincadeira", ilustracao: "aviao", categorias: ["brat"] },
    ],
  },
  {
    id: "intensidade-conduzir",
    tipo: "intensidade",
    enunciado: "Combinar as regras e tomar as decisões durante um encontro.",
    ilustracao: "coroa",
    categorias: ["dominante"],
    aprofunda: "poder",
  },
  {
    id: "intensidade-entregar",
    tipo: "intensidade",
    enunciado: "Entregar as decisões a alguém em quem você confia.",
    ilustracao: "chave",
    categorias: ["submisso"],
    aprofunda: "poder",
  },
  {
    id: "rapida-alternar",
    tipo: "rapida",
    enunciado: "Você curte alternar entre conduzir e deixar a outra pessoa conduzir?",
    categorias: ["switch"],
    aprofunda: "poder",
  },
  {
    id: "intensidade-desafiar",
    tipo: "intensidade",
    enunciado: "Desafiar de brincadeira quem está conduzindo, só para ver a reação.",
    ilustracao: "aviao",
    categorias: ["brat"],
    aprofunda: "poder",
  },
  {
    id: "intensidade-amarracao",
    tipo: "intensidade",
    enunciado: "Ter os movimentos limitados por amarrações combinadas antes.",
    ilustracao: "corda",
    categorias: ["amarracao"],
  },
  {
    id: "cena-intensidade",
    tipo: "cenas",
    enunciado: "Qual destas cenas tem mais a ver com você?",
    opcoes: [
      { id: "corda", rotulo: "Nós de corda feitos com calma", ilustracao: "corda", categorias: ["amarracao"] },
      { id: "pimenta", rotulo: "Provocar uma sensação forte", ilustracao: "pimenta", categorias: ["sadista"] },
      { id: "rosa", rotulo: "Receber uma sensação forte", ilustracao: "rosa", categorias: ["masoquista"] },
      { id: "aviao", rotulo: "Uma provocação atrevida", ilustracao: "aviao", categorias: ["brat"] },
    ],
  },
  {
    id: "intensidade-provocar",
    tipo: "intensidade",
    enunciado: "Provocar sensações fortes em alguém que pediu por isso, dentro do combinado.",
    ilustracao: "pimenta",
    categorias: ["sadista"],
  },
  {
    id: "rapida-sensacoes",
    tipo: "rapida",
    enunciado: "Apertos ou arranhões, combinados antes e com palavra de segurança, te interessam?",
    categorias: ["masoquista"],
  },
];
