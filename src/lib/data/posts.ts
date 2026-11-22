import type { CommunityPost } from "@/lib/types";

export const COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: "c1",
    category: "vacinas",
    title: "Calendário de Vacinação Adulto no SUS: HPV, Hepatites A & B e Mpox",
    summary:
      "Guia direto ao ponto sobre quais vacinas gratuitas estão disponíveis para a nossa comunidade e como agendar no posto mais próximo.",
    author: "Dani Rocha · Enfermeiro & Curadoria Orbit",
    date: "Hoje · 14:20",
    readTime: "3 min",
    likes: 84,
    liked: false,
    content: [
      "Manter a carteira de vacinação em dia é uma das formas mais simples e eficazes de autocuidado. Muitas pessoas ainda não sabem que o SUS oferece proteção gratuita para várias infecções relevantes para adultos sexualmente ativos.",
      "• Hepatite B: esquema de 3 doses disponível gratuitamente em qualquer UBS para todas as faixas etárias.",
      "• Hepatite A e HPV (quadrivalente): disponíveis em centros de referência (CRIE) para grupos prioritários, incluindo usuários de PrEP e pessoas vivendo com HIV.",
      "• Mpox: fique atento às janelas de campanha municipal para públicos prioritários. Leve sempre seu cartão do SUS ou CPF e documento com foto.",
    ],
    comments: [
      {
        author: "Bruno M.",
        time: "há 40 min",
        text: "Consegui tomar a segunda dose de Hepatite B ontem no posto do bairro, super rápido!",
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
    title: "PrEP Diária vs. PrEP Sob Demanda (2+1+1): como escolher com segurança",
    summary:
      "Entenda as diferenças entre os dois protocolos de prevenção ao HIV aprovados pelo Ministério da Saúde e como iniciar gratuitamente.",
    author: "Coletivo Saúde do Vale",
    date: "Ontem",
    readTime: "4 min",
    likes: 119,
    liked: true,
    content: [
      "A Profilaxia Pré-Exposição (PrEP) revolucionou a prevenção combinada. Hoje existem dois modelos principais acompanhados gratuitamente pelo SUS:",
      "1. PrEP Diária: 1 comprimido todos os dias no mesmo horário. Indicada para qualquer pessoa com vida sexual ativa que prefere previsibilidade e proteção contínua.",
      "2. PrEP Sob Demanda (2+1+1): voltada especificamente para homens cis e pessoas designadas do sexo masculino ao nascer que têm relações menos frequentes (2 comprimidos entre 2h e 24h antes da relação, 1 comprimido 24h depois e outro 48h depois).",
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
    title: "Fadiga de grade quadrada: por que os apps de encontro estão nos esgotando?",
    summary:
      "Como a dinâmica mecânica de catálogo e rejeição silenciosa afeta a autoestima — e como espaços sociais mais humanos podem mudar isso.",
    author: "Igor Mendes · Psicólogo Clínico",
    date: "Há 2 dias",
    readTime: "5 min",
    likes: 156,
    liked: false,
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
    title: "Qual recurso você mais sente falta nas versões Web dos apps de relacionamento?",
    summary:
      "Fórum aberto da comunidade Orbit: conte suas maiores dores de usabilidade para ajudar a moldar o roadmap do MVP.",
    author: "Lucas Silva · Criador do Orbit",
    date: "Há 3 dias",
    readTime: "2 min",
    likes: 92,
    liked: false,
    content: [
      "O Orbit nasceu de uma frustração simples: usar apps de encontro no computador é quase sempre uma experiência limitada, desconectada e fragmentada entre 4 plataformas diferentes.",
      "Queremos construir esse hub junto com a comunidade. O que mais faz falta no seu dia a dia? Filtros por intenção real? Espaços abertos para fazer amizades? Integração mais limpa com o relógio?",
      "Deixe sua ideia nos comentários abaixo — estamos documentando tudo abertamente para a próxima versão!",
    ],
    comments: [
      {
        author: "Gui",
        time: "há 2 dias",
        text: "Atalhos de teclado decentes no desktop e separar claramente quem quer conversar de quem quer algo imediato!",
      },
    ],
  },
];

export function getPost(id: string): CommunityPost | undefined {
  return COMMUNITY_POSTS.find((p) => p.id === id);
}
