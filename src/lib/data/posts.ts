import type { CommunityPost } from "@/lib/types";

export const COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: "c1",
    category: "vacinas",
    kind: "artigo",
    status: "publicado",
    title: "Calendário de Vacinação Adulto no SUS: HPV, Hepatites A & B e Mpox",
    summary:
      "Guia direto ao ponto sobre quais vacinas gratuitas estão disponíveis para a nossa comunidade e como agendar no posto mais próximo.",
    author: "Dani Rocha · Enfermeiro",
    professional: { name: "Dani Rocha", council: "COREN", uf: "MG" },
    date: "Hoje · 14:20",
    ageHours: 3,
    readTime: "3 min",
    score: 84,
    vote: 0,
    content: [
      "Manter a carteira de vacinação em dia é uma das formas mais simples e eficazes de autocuidado. Muitas pessoas ainda não sabem que o SUS oferece proteção gratuita para várias infecções relevantes para adultos sexualmente ativos.",
      {
        list: "ul",
        items: [
          "Hepatite B: esquema de 3 doses disponível gratuitamente em qualquer UBS para todas as faixas etárias.",
          "Hepatite A e HPV (quadrivalente): disponíveis em centros de referência (CRIE) para grupos prioritários, incluindo usuários de PrEP e pessoas vivendo com HIV.",
          "Mpox: fique atento às janelas de campanha municipal para públicos prioritários. Leve sempre seu cartão do SUS ou CPF e documento com foto.",
        ],
      },
    ],
    comments: [
      {
        author: "Bruno M.",
        time: "há 40 min",
        text: "Consegui tomar a segunda dose de Hepatite B ontem no posto do bairro, super rápido!",
        replies: [
          {
            author: "Dani Rocha",
            time: "há 25 min",
            text: "Boa! A terceira dose fecha o esquema, então já deixa anotada a data no cartão.",
          },
        ],
      },
      {
        author: "Matheus",
        time: "há 18 min",
        text: "Excelente resumo! Muita gente no trabalho não sabia que usuários de PrEP têm direito à HPV.",
      },
    ],
  },
  {
    id: "c2",
    category: "prevencao",
    kind: "artigo",
    status: "publicado",
    title: "PrEP Diária vs. PrEP Sob Demanda (2+1+1): como escolher com segurança",
    summary:
      "Entenda as diferenças entre os dois protocolos de prevenção ao HIV aprovados pelo Ministério da Saúde e como iniciar gratuitamente.",
    author: "Dra. Helena Prado · Infectologista",
    professional: { name: "Helena Prado", council: "CRM", uf: "RS" },
    date: "Ontem",
    ageHours: 26,
    readTime: "4 min",
    score: 119,
    vote: 1,
    content: [
      "A Profilaxia Pré-Exposição (PrEP) revolucionou a prevenção combinada. Hoje existem dois modelos principais acompanhados gratuitamente pelo SUS:",
      {
        list: "ol",
        items: [
          "PrEP Diária: 1 comprimido todos os dias no mesmo horário. Indicada para qualquer pessoa com vida sexual ativa que prefere previsibilidade e proteção contínua.",
          "PrEP Sob Demanda (2+1+1): voltada especificamente para homens cis e pessoas designadas do sexo masculino ao nascer que têm relações menos frequentes (2 comprimidos entre 2h e 24h antes da relação, 1 comprimido 24h depois e outro 48h depois).",
        ],
      },
      "Importante: a PrEP previne o HIV, mas não outras ISTs — por isso a testagem regular trimestral e o diálogo aberto continuam essenciais.",
    ],
    comments: [
      {
        author: "Diego",
        time: "ontem",
        text: "A modalidade sob demanda facilitou muito minha rotina. Recomendo conversar no CTA da sua cidade.",
      },
    ],
  },
  {
    id: "c3",
    category: "bemestar",
    kind: "artigo",
    status: "publicado",
    title: "Fadiga de grade quadrada: por que os apps de encontro estão nos esgotando?",
    summary:
      "Como a dinâmica mecânica de catálogo e rejeição silenciosa afeta a autoestima — e como espaços sociais mais humanos podem mudar isso.",
    author: "Igor Mendes · Psicólogo Clínico",
    professional: { name: "Igor Mendes", council: "CRP", uf: "SP" },
    date: "Há 2 dias",
    ageHours: 50,
    readTime: "5 min",
    score: 156,
    vote: 0,
    content: [
      'Passar horas rolando grades infinitas de torsos e respondendo roteiros automáticos ("oi / tudo bem / foto") gera um desgaste emocional real, conhecido como fadiga de aplicativos de relacionamento.',
      "Quando toda interação nasce de um filtro instantâneo sem contexto, o cérebro associa socialização a avaliação constante. Criar espaços com contexto compartilhado — como salas de conversa leve, parques virtuais e interesses explícitos — devolve a naturalidade do encontro.",
      "Dica prática: defina janelas de uso, desative notificações invasivas e priorize ambientes onde você também possa conversar sem pressão.",
    ],
    comments: [
      {
        author: "Thiago",
        time: "há 1 dia",
        text: "Me senti 100% representado. A ideia de ter uma sala estilo parque tira aquele clima frio de catálogo.",
      },
      {
        author: "Leo",
        time: "há 9 horas",
        text: "Total! Poder avisar no perfil que hoje só quero troca de ideia já corta metade do estresse.",
      },
    ],
  },
  {
    id: "c4",
    category: "debates",
    kind: "discussao",
    status: "publicado",
    title: "Qual recurso você mais sente falta nas versões Web dos apps de relacionamento?",
    summary:
      "Fórum aberto da comunidade Orbit: conte suas maiores dores de usabilidade para ajudar a moldar o roadmap do MVP.",
    author: "Lucas Silva · Criador do Orbit",
    authorProfileId: "me",
    topics: ["tecnologia", "design"],
    date: "Há 3 dias",
    ageHours: 74,
    readTime: "2 min",
    score: 92,
    vote: 0,
    content: [
      "O Orbit nasceu de uma frustração simples: usar apps de encontro no computador é quase sempre uma experiência limitada, desconectada e fragmentada entre 4 plataformas diferentes.",
      "Queremos construir esse hub junto com a comunidade. O que mais faz falta no seu dia a dia? Filtros por intenção real? Espaços abertos para fazer amizades? Integração mais limpa com o relógio?",
      "Deixe sua ideia nos comentários abaixo — estamos documentando tudo abertamente para a próxima versão!",
    ],
    comments: [
      {
        author: "Gui",
        profileId: "p10",
        time: "há 2 dias",
        text: "Atalhos de teclado decentes no desktop e separar claramente quem quer conversar de quem quer algo imediato!",
        replies: [
          {
            author: "Lucas Silva",
            profileId: "me",
            time: "há 1 dia",
            text: "Anotado! Atalhos de teclado entram no roadmap do desktop junto com os filtros por intenção.",
          },
          {
            author: "Leo",
            profileId: "p7",
            time: "há 20 h",
            text: "E um modo relógio que avise quando alguém com intenção de amizade estiver por perto!",
          },
        ],
      },
    ],
  },
  {
    id: "c5",
    category: "prevencao",
    kind: "discussao",
    status: "publicado",
    title: "Alguém já precisou de PEP num fim de semana? Como foi o atendimento?",
    summary:
      "Fiquei na dúvida de onde ir fora do horário comercial. Queria ouvir experiências para não travar se acontecer de novo.",
    author: "Caio R.",
    date: "Há 5 h",
    ageHours: 5,
    readTime: "1 min",
    score: 37,
    vote: 0,
    content: [
      "Fiquei na dúvida de onde ir fora do horário comercial. Queria ouvir experiências para não travar se acontecer de novo.",
      "Vocês foram em UPA, hospital ou serviço especializado? Pediram algum documento?",
    ],
    comments: [
      {
        author: "Rê",
        time: "há 4 h",
        text: "Fui numa UPA num domingo e fui bem atendida. Vale conferir no site da prefeitura quais serviços fazem PEP na sua cidade.",
        replies: [
          {
            author: "Caio R.",
            time: "há 3 h",
            text: "Valeu demais, Rê! Vou salvar o link da prefeitura.",
          },
        ],
      },
      {
        author: "Diego",
        time: "há 2 h",
        text: "O mais importante é não esperar: quanto antes começar, melhor. Depois fiz o acompanhamento no CTA.",
      },
    ],
  },
  {
    id: "c6",
    category: "bemestar",
    kind: "discussao",
    status: "publicado",
    title: "Sair do armário depois dos 30: bora montar uma roda de conversa?",
    summary:
      "Pensei num encontro online quinzenal, sem pressão, para quem está vivendo isso agora ou já passou por lá.",
    author: "Marina",
    date: "Ontem",
    ageHours: 30,
    readTime: "1 min",
    score: 64,
    vote: 0,
    content: [
      "Pensei num encontro online quinzenal, sem pressão, para quem está vivendo isso agora ou já passou por lá.",
      "Quem topa? Podemos usar o Parque do Orbit como ponto de encontro.",
    ],
    comments: [
      {
        author: "Tati",
        time: "há 20 h",
        text: "Topo demais! Seria ótimo ter alguém de psicologia acompanhando de vez em quando.",
      },
    ],
  },
  {
    id: "c7",
    category: "debates",
    kind: "discussao",
    status: "publicado",
    title: "Qual filme ou série LGBTQIA+ todo mundo deveria ver pelo menos uma vez?",
    summary:
      "Montando uma lista coletiva para uma sessão de cinema no Parque. Vale clássico, lançamento e série curta.",
    author: "Thiago",
    authorProfileId: "p3",
    topics: ["cinema", "series"],
    date: "Ontem",
    ageHours: 20,
    readTime: "1 min",
    score: 71,
    vote: 0,
    content: [
      "Montando uma lista coletiva para uma sessão de cinema no Parque. Vale clássico, lançamento e série curta.",
      "Eu começo: Moonlight e Pose. Quem completa?",
    ],
    comments: [
      {
        author: "Leo",
        profileId: "p7",
        time: "há 18 h",
        text: "Hoje Eu Quero Voltar Sozinho, sem discussão!",
        replies: [
          {
            author: "Thiago",
            profileId: "p3",
            time: "há 16 h",
            text: "Clássico absoluto do cinema nacional! Já entrou na lista da sessão.",
          },
        ],
      },
      {
        author: "Yasmin",
        profileId: "p32",
        time: "há 12 h",
        text: "Heartstopper pra quem quer algo leve, e Paris Is Burning pra entender de onde veio o ballroom.",
      },
    ],
  },
];

export function getPost(id: string): CommunityPost | undefined {
  return COMMUNITY_POSTS.find((p) => p.id === id);
}
