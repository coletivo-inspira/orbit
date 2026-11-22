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
      { id: "jantar", rotulo: "Um jantar à luz de velas", ilustracao: "jantar", categorias: ["conexao"] },
      {
        id: "coracoes",
        rotulo: "Um encontro com mais gente, com acordos",
        ilustracao: "coracoes",
        categorias: ["relacoes-abertas"],
      },
      { id: "mapa", rotulo: "Uma viagem sem roteiro", ilustracao: "mapa", categorias: ["exploracao"] },
    ],
  },
  {
    id: "rapida-carinho",
    tipo: "rapida",
    enunciado: "Carinho, beijo demorado e conversa bastam para uma noite ótima?",
    categorias: ["conexao"],
  },
  {
    id: "intensidade-vinculos",
    tipo: "intensidade",
    enunciado: "Ter mais de um vínculo afetivo ao mesmo tempo, com todo mundo sabendo.",
    ilustracao: "coracoes",
    categorias: ["relacoes-abertas"],
  },
  {
    id: "rapida-acordos",
    tipo: "rapida",
    enunciado: "Uma relação aberta, com acordos claros, faz sentido para você?",
    categorias: ["relacoes-abertas"],
  },
  {
    id: "cena-objeto",
    tipo: "cenas",
    enunciado: "Qual destes objetos desperta mais a sua curiosidade?",
    opcoes: [
      { id: "caneca", rotulo: "Uma manta e uma caneca quente", ilustracao: "caneca", categorias: ["cuidado"] },
      { id: "couro", rotulo: "Luvas e botas de couro", ilustracao: "couro", categorias: ["texturas"] },
      { id: "mapa", rotulo: "Um mapa de lugares novos", ilustracao: "mapa", categorias: ["exploracao"] },
      { id: "corda", rotulo: "Uma corda macia enrolada", ilustracao: "corda", categorias: ["cordas"] },
    ],
  },
  {
    id: "rapida-materiais",
    tipo: "rapida",
    enunciado: "Couro, látex ou seda mexem com você?",
    categorias: ["texturas"],
  },
  {
    id: "cena-ambiente",
    tipo: "cenas",
    enunciado: "Qual ambiente parece mais convidativo?",
    opcoes: [
      { id: "janela", rotulo: "Uma varanda com vista para a cidade", ilustracao: "janela", categorias: ["olhar"] },
      { id: "palco", rotulo: "Uma pista sob o holofote", ilustracao: "palco", categorias: ["ser-visto"] },
      { id: "couro", rotulo: "Um clube de couro", ilustracao: "couro", categorias: ["texturas"] },
    ],
  },
  {
    id: "intensidade-observar",
    tipo: "intensidade",
    enunciado: "Observar de longe um casal flertando, com o consentimento de todo mundo.",
    ilustracao: "janela",
    categorias: ["olhar"],
  },
  {
    id: "intensidade-ser-visto",
    tipo: "intensidade",
    enunciado: "Saber que alguém te admira de longe, com o seu consentimento.",
    ilustracao: "palco",
    categorias: ["ser-visto"],
  },
  {
    id: "cena-olhar",
    tipo: "cenas",
    enunciado: "E agora, qual dessas cenas te atrai mais?",
    opcoes: [
      { id: "janela", rotulo: "Uma janela acesa do outro lado da rua", ilustracao: "janela", categorias: ["olhar"] },
      { id: "palco", rotulo: "Dançar sabendo que estão olhando", ilustracao: "palco", categorias: ["ser-visto"] },
      {
        id: "caneca",
        rotulo: "Dar ou receber cuidado depois de um dia longo",
        ilustracao: "caneca",
        categorias: ["cuidado"],
      },
      { id: "jantar", rotulo: "Uma noite tranquila a dois", ilustracao: "jantar", categorias: ["conexao"] },
    ],
  },
  {
    id: "cena-cenario",
    tipo: "cenas",
    enunciado: "Para uma noite diferente, qual cenário chama você?",
    opcoes: [
      { id: "mascaras", rotulo: "Máscaras e personagens", ilustracao: "mascaras", categorias: ["encenacao"] },
      { id: "floresta", rotulo: "Uma floresta sob a lua", ilustracao: "floresta", categorias: ["instinto"] },
      { id: "mapa", rotulo: "Um lugar onde você nunca foi", ilustracao: "mapa", categorias: ["exploracao"] },
    ],
  },
  {
    id: "intensidade-personagens",
    tipo: "intensidade",
    enunciado: "Interpretar personagens e inventar uma história juntos.",
    ilustracao: "mascaras",
    categorias: ["encenacao"],
  },
  {
    id: "intensidade-cuidado",
    tipo: "intensidade",
    enunciado: "Uma dinâmica entre adultos em que uma pessoa cuida e protege, e a outra se deixa acolher.",
    ilustracao: "caneca",
    categorias: ["cuidado"],
  },
  {
    id: "rapida-caca",
    tipo: "rapida",
    enunciado: "Brincar de caça e caçador, com muita energia física, te anima?",
    categorias: ["instinto"],
  },
  {
    id: "cena-convite",
    tipo: "cenas",
    enunciado: "Que convite você aceitaria primeiro?",
    opcoes: [
      { id: "mascaras", rotulo: "Um baile de máscaras", ilustracao: "mascaras", categorias: ["encenacao"] },
      { id: "floresta", rotulo: "Uma trilha noturna", ilustracao: "floresta", categorias: ["instinto"] },
      {
        id: "coracoes",
        rotulo: "Uma festa entre pessoas queridas",
        ilustracao: "coracoes",
        categorias: ["relacoes-abertas"],
      },
      {
        id: "pimenta",
        rotulo: "Uma noite bem apimentada",
        ilustracao: "pimenta",
        categorias: ["sensacoes-dar", "sensacoes-receber"],
      },
    ],
  },
  {
    id: "intensidade-poder",
    tipo: "intensidade",
    enunciado: "Jogos em que uma pessoa conduz e a outra segue, combinados antes.",
    ilustracao: "coroa",
    categorias: ["conduzir", "entregar", "alternar"],
    filtro: "poder",
  },
  {
    id: "cena-papel",
    tipo: "cenas",
    enunciado: "Num jogo combinado, qual papel combina mais com você?",
    aprofunda: "poder",
    opcoes: [
      { id: "coroa", rotulo: "Quem dita as regras", ilustracao: "coroa", categorias: ["conduzir"] },
      { id: "chave", rotulo: "Quem entrega a chave", ilustracao: "chave", categorias: ["entregar"] },
      { id: "setas", rotulo: "Depende do dia", ilustracao: "setas", categorias: ["alternar"] },
      { id: "aviao", rotulo: "Quem provoca de brincadeira", ilustracao: "aviao", categorias: ["provocacao"] },
    ],
  },
  {
    id: "intensidade-conduzir",
    tipo: "intensidade",
    enunciado: "Combinar as regras e tomar as decisões durante um encontro.",
    ilustracao: "coroa",
    categorias: ["conduzir"],
    aprofunda: "poder",
  },
  {
    id: "intensidade-entregar",
    tipo: "intensidade",
    enunciado: "Entregar as decisões a alguém em quem você confia.",
    ilustracao: "chave",
    categorias: ["entregar"],
    aprofunda: "poder",
  },
  {
    id: "rapida-alternar",
    tipo: "rapida",
    enunciado: "Você curte alternar entre conduzir e deixar a outra pessoa conduzir?",
    categorias: ["alternar"],
    aprofunda: "poder",
  },
  {
    id: "intensidade-desafiar",
    tipo: "intensidade",
    enunciado: "Desafiar de brincadeira quem está conduzindo, só para ver a reação.",
    ilustracao: "aviao",
    categorias: ["provocacao"],
    aprofunda: "poder",
  },
  {
    id: "intensidade-amarracao",
    tipo: "intensidade",
    enunciado: "Ter os movimentos limitados por amarrações combinadas antes.",
    ilustracao: "corda",
    categorias: ["cordas"],
  },
  {
    id: "cena-intensidade",
    tipo: "cenas",
    enunciado: "Qual destas cenas tem mais a ver com você?",
    opcoes: [
      { id: "corda", rotulo: "Nós de corda feitos com calma", ilustracao: "corda", categorias: ["cordas"] },
      { id: "pimenta", rotulo: "Provocar uma sensação forte", ilustracao: "pimenta", categorias: ["sensacoes-dar"] },
      { id: "rosa", rotulo: "Receber uma sensação forte", ilustracao: "rosa", categorias: ["sensacoes-receber"] },
      { id: "aviao", rotulo: "Uma provocação atrevida", ilustracao: "aviao", categorias: ["provocacao"] },
    ],
  },
  {
    id: "intensidade-provocar",
    tipo: "intensidade",
    enunciado: "Provocar sensações fortes em alguém que pediu por isso, dentro do combinado.",
    ilustracao: "pimenta",
    categorias: ["sensacoes-dar"],
  },
  {
    id: "rapida-sensacoes",
    tipo: "rapida",
    enunciado: "Apertos ou arranhões, combinados antes e com palavra de segurança, te interessam?",
    categorias: ["sensacoes-receber"],
  },
];
