import type { CommunityCategory, ExternalCommunity } from "@/lib/types";

/** Outbound links only: the app never calls the Reddit API. */
export const REDDIT_COMMUNITIES: ExternalCommunity[] = [
  {
    name: "arco_iris",
    description: "Comunidade LGBTQIA+ brasileira: conversas, desabafos e indicações.",
    language: "pt-BR",
    categories: ["debates", "bemestar"],
  },
  {
    name: "transbr",
    description: "Pessoas trans brasileiras: transição, documentos, SUS e apoio.",
    language: "pt-BR",
    categories: ["bemestar", "prevencao", "debates"],
  },
  {
    name: "BissexualidadeBr",
    description: "Espaço brasileiro para pessoas bi e pan.",
    language: "pt-BR",
    categories: ["debates", "bemestar"],
  },
  {
    name: "LGBT_Brasil",
    description: "Notícias e discussões LGBTQIA+ do Brasil.",
    language: "pt-BR",
    categories: ["debates"],
  },
  {
    name: "prep",
    description: "Dúvidas e experiências com PrEP (em inglês).",
    language: "en",
    categories: ["prevencao", "vacinas"],
  },
  {
    name: "asktransgender",
    description: "Perguntas sobre identidade e transição (em inglês).",
    language: "en",
    categories: ["bemestar", "prevencao"],
  },
  {
    name: "actuallesbians",
    description: "Comunidade de mulheres lésbicas e sáficas (em inglês).",
    language: "en",
    categories: ["debates", "bemestar"],
  },
];

export function redditUrl(name: string): string {
  return `https://www.reddit.com/r/${name}/`;
}

export function redditCommunitiesFor(filter: "all" | CommunityCategory): ExternalCommunity[] {
  if (filter === "all") return REDDIT_COMMUNITIES;
  const related = REDDIT_COMMUNITIES.filter((c) => c.categories.includes(filter));
  return [...related, ...REDDIT_COMMUNITIES.filter((c) => !c.categories.includes(filter))];
}
