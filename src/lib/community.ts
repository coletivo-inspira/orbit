import { COMMUNITY_CATEGORIES } from "@/lib/data/intentions";
import { extractKeywords, MAX_COMMENT_TAGS, sanitizeTags } from "@/lib/keywords";
import type {
  ArticleBlock,
  CommunityCategory,
  CommunityPost,
  PostComment,
  PostDraft,
  ProfessionalCouncil,
  TopicId,
  VoteDirection,
} from "@/lib/types";

/**
 * Categories whose threads may link people by interest. Health categories never do:
 * commenting on a PrEP or mental-health thread must not become a public tag (LGPD, sensitive data).
 */
export const INTEREST_CATEGORIES: readonly CommunityCategory[] = ["debates"];

/** Topics each person engaged with in open discussions, keyed by profile id ("me" for the user). */
export function communityTopics(posts: readonly CommunityPost[]): Map<string, Set<TopicId>> {
  const byPerson = new Map<string, Set<TopicId>>();
  const add = (who: string | undefined, topics: TopicId[]) => {
    if (!who) return;
    const set = byPerson.get(who) ?? new Set<TopicId>();
    topics.forEach((t) => set.add(t));
    byPerson.set(who, set);
  };
  for (const post of posts) {
    if (!post.topics?.length || !INTEREST_CATEGORIES.includes(post.category) || post.status !== "publicado") continue;
    add(post.authorProfileId, post.topics);
    for (const c of post.comments) add(c.local ? "me" : c.profileId, post.topics);
  }
  return byPerson;
}

/**
 * Health categories: a comment's own words never become tags there, so writing on a PrEP or
 * mental-health thread doesn't put a sensitive keyword next to someone's name.
 */
export function isHealthCategory(category: CommunityCategory): boolean {
  return !INTEREST_CATEGORIES.includes(category);
}

function blockText(block: ArticleBlock): string {
  return typeof block === "string" ? block : block.items.join(" ");
}

/** The post's tags: the ones its author kept, or keywords extracted from the text. */
export function postTags(post: CommunityPost): string[] {
  if (post.tags) return post.tags;
  return extractKeywords(post.title, [post.summary, ...post.content.map(blockText)].join(" "));
}

/** Automatic keywords of a comment or reply; none in health categories. */
export function commentTags(comment: PostComment, category: CommunityCategory): string[] {
  if (isHealthCategory(category)) return [];
  return extractKeywords("", comment.text, MAX_COMMENT_TAGS);
}

/** Comments plus their replies. */
export function commentCount(post: CommunityPost): number {
  return post.comments.reduce((n, c) => n + 1 + (c.replies?.length ?? 0), 0);
}

export type CommunitySort = "hot" | "new";

export const COUNCILS: Record<ProfessionalCouncil, { profession: string; name: string }> = {
  CRM: { profession: "Médico(a)", name: "Conselho Regional de Medicina" },
  COREN: { profession: "Enfermeiro(a)", name: "Conselho Regional de Enfermagem" },
  CRP: { profession: "Psicólogo(a)", name: "Conselho Regional de Psicologia" },
};

export const UFS = [
  "AC",
  "AL",
  "AM",
  "AP",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MG",
  "MS",
  "MT",
  "PA",
  "PB",
  "PE",
  "PI",
  "PR",
  "RJ",
  "RN",
  "RO",
  "RR",
  "RS",
  "SC",
  "SE",
  "SP",
  "TO",
] as const;

export const TITLE_LIMITS = { min: 8, max: 140 } as const;
export const BODY_LIMITS = { min: 20, max: 4000 } as const;
export const MODERATION_TEAM = "Moderação Orbit (simulada)";

export function credentialLabel(p: { council: ProfessionalCouncil; uf: string }): string {
  return `${p.council}-${p.uf}`;
}

/** Returns pt-BR messages for every invalid field; an empty list means the draft can be submitted. */
export function validateDraft(draft: PostDraft): string[] {
  const errors: string[] = [];
  const title = draft.title.trim();
  const body = draft.body.trim();
  if (!Object.hasOwn(COMMUNITY_CATEGORIES, draft.category)) errors.push("Escolha uma subcomunidade.");
  if (title.length < TITLE_LIMITS.min || title.length > TITLE_LIMITS.max) {
    errors.push(`O título precisa ter entre ${TITLE_LIMITS.min} e ${TITLE_LIMITS.max} caracteres.`);
  }
  if (body.length < BODY_LIMITS.min || body.length > BODY_LIMITS.max) {
    errors.push(`O texto precisa ter entre ${BODY_LIMITS.min} e ${BODY_LIMITS.max} caracteres.`);
  }
  if (draft.kind === "artigo") {
    const p = draft.professional;
    if (!p || p.name.trim().length < 3) errors.push("Informe seu nome profissional.");
    if (!p || !Object.hasOwn(COUNCILS, p.council)) errors.push("Escolha o conselho profissional.");
    if (!p || !/^\d{4,8}$/.test(p.registration.trim())) errors.push("O registro deve ter de 4 a 8 dígitos.");
    if (!p || !(UFS as readonly string[]).includes(p.uf)) errors.push("Escolha a UF do registro.");
  }
  return errors;
}

export function buildPost(draft: PostDraft, id: string, authorName: string): CommunityPost {
  const paragraphs = draft.body
    .trim()
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const words = draft.body.trim().split(/\s+/).length;
  const summary = paragraphs[0].length > 160 ? `${paragraphs[0].slice(0, 157).trimEnd()}…` : paragraphs[0];
  const base = {
    id,
    category: draft.category,
    authorProfileId: "me",
    title: draft.title.trim(),
    summary,
    date: "Agora",
    ageHours: 0,
    readTime: `${Math.max(1, Math.round(words / 200))} min`,
    score: 1,
    vote: 1 as const,
    content: paragraphs,
    tags: draft.tags ? sanitizeTags(draft.tags) : extractKeywords(draft.title, draft.body),
    comments: [],
  };
  if (draft.kind === "artigo" && draft.professional) {
    const p = draft.professional;
    const name = p.name.trim();
    return {
      ...base,
      kind: "artigo",
      status: "em_revisao",
      author: `${name} · ${COUNCILS[p.council].profession}`,
      professional: { name, council: p.council, uf: p.uf, registration: p.registration.trim() },
    };
  }
  return { ...base, kind: "discussao", status: "publicado", author: authorName };
}

export function applyVote(post: CommunityPost, direction: Exclude<VoteDirection, 0>): CommunityPost {
  const next: VoteDirection = post.vote === direction ? 0 : direction;
  return { ...post, vote: next, score: post.score - post.vote + next };
}

function hotRank(post: CommunityPost): number {
  return post.score / Math.pow(post.ageHours + 2, 1.5);
}

export function sortPosts(posts: CommunityPost[], sort: CommunitySort): CommunityPost[] {
  const ranked = [...posts];
  if (sort === "new") return ranked.sort((a, b) => a.ageHours - b.ageHours);
  return ranked.sort((a, b) => hotRank(b) - hotRank(a));
}
