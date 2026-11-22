/**
 * Automatic tags for community posts and comments: the words that carry meaning,
 * without articles, prepositions, pronouns and filler verbs ("a", "e", "de", "que", "foi"…).
 */

const STOPWORDS = new Set(
  `a à ao aos as às o os um uma uns umas de da das do dos d em na nas no nos num numa dum duma
  e é ou mas nem que se porque pois porém como quando onde enquanto então logo também já ainda só sempre nunca
  pra pro pras pros para por pelo pela pelos pelas com sem sob sobre entre até após ante contra desde perante
  eu tu ele ela nós vós eles elas você vocês voce voces me te se lhe nos vos lhes mim ti si comigo contigo conosco
  meu minha meus minhas teu tua teus tuas seu sua seus suas nosso nossa nossos nossas dele dela deles delas
  este esta estes estas esse essa esses essas aquele aquela aqueles aquelas isto isso aquilo aqui ali lá cá aí
  qual quais quem cujo cuja quanto quanta quantos quantas o que oque
  todo toda todos todas tudo nada algo alguém alguem ninguém ninguem cada outro outra outros outras mesmo mesma
  muito muita muitos muitas pouco pouca poucos poucas mais menos tão tanto tanta tantos tantas bem mal
  sim não nao talvez agora hoje ontem amanhã amanha depois antes cedo tarde vez vezes
  ser sou é era eram foi fui foram será serão seria sendo sido seja sejam
  estar estou está esta estava estavam estive esteve estão estao estamos estando estado
  ter tenho tem têm tinha tinham tive teve tiveram terá teria tendo tido tenha
  haver há havia houve haja ir vou vai vamos vão vao ia iam fui indo ido
  fazer faço faz fazem fiz fez fizeram feito fazendo
  poder posso pode podem podia pude pôde podemos
  dar dá dou deu dão dando dado ver vejo vê viu vendo visto vi
  querer quero quer querem queria quis saber sei sabe sabem sabia
  achar acho acha achei falar falo fala falei dizer digo diz disse
  ficar fico fica ficou deixar deixa deixe
  coisa coisas gente pessoal tipo aí né ne ok tá ta oi olá ola bora vamo
  alguma algum algumas alguns qualquer quaisquer vários várias varios varias
  dia dias ano anos hora horas semana semanas mês mes
  lá ai aí aqui assim disso nisso desse dessa deste desta neste nesta nesse nessa
  sua seus pelo pela vale sobre tal tais fim meio junto demais super total
  falta sente sinto sentir precisa preciso precisou precisam precisar deve devem deveria deveriam
  seria poderia gostaria teria faria iria sair montar escolher voltar conseguir consegui conseguiu
  comentar contar conta conte usar uso começo começar mundo leve absoluto anotado topa topo topar topam
  melhor pior grande novo nova novos novas primeiro primeira segunda último última legal ótimo ótima
  incrível rápido rápida fácil difícil importante simples certo certa real parte forma jeito caso lado fora dentro`.split(
    /\s+/,
  ),
);

/** Conjugated verbs (past, gerund, imperfect) rarely make good tags: "fiquei", "precisou", "fazendo". */
const VERB_ENDING = /(?:ei|ou|iu|aram|eram|iram|avam|ava|ando|endo|indo)$/;

/** Lowercase, without accents: the comparison key for tags and search. */
export function normalizeSearch(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

/** Folds simple plurals so "filme" and "filmes" become one tag. */
function tagKey(word: string): string {
  const base = normalizeSearch(word);
  if (base.length > 4 && base.endsWith("oes")) return `${base.slice(0, -3)}ao`;
  if (base.length > 4 && base.endsWith("s")) return base.slice(0, -1);
  return base;
}

const WORD = /[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*/gu;

export const MAX_POST_TAGS = 5;
export const MAX_COMMENT_TAGS = 2;
export const TAG_MAX_LENGTH = 24;

/**
 * Most meaningful words of a text, best first. Title words count double.
 * Returns display forms (lowercase, accents kept), one per tag key.
 */
export function extractKeywords(title: string, body = "", max = MAX_POST_TAGS): string[] {
  const scores = new Map<string, { word: string; score: number; first: number }>();
  let position = 0;
  const add = (text: string, weight: number) => {
    for (const match of text.matchAll(WORD)) {
      const word = match[0].toLowerCase();
      position++;
      if (word.length < 3 || /^\d+$/.test(word) || word.length > TAG_MAX_LENGTH) continue;
      if (STOPWORDS.has(word) || STOPWORDS.has(normalizeSearch(word))) continue;
      if (word.length >= 6 && VERB_ENDING.test(normalizeSearch(word))) continue;
      const key = tagKey(word);
      const current = scores.get(key);
      if (current) {
        current.score += weight;
        // Prefer the singular as the visible form.
        if (word.length < current.word.length) current.word = word;
      } else scores.set(key, { word, score: weight, first: position });
    }
  };
  add(title, 2);
  add(body, 1);
  return [...scores.values()]
    .sort((a, b) => b.score - a.score || a.first - b.first)
    .slice(0, max)
    .map((s) => s.word);
}

/** Same tag regardless of accents, case or plural. */
export function sameTag(a: string, b: string): boolean {
  return tagKey(a) === tagKey(b);
}

export function tagId(tag: string): string {
  return tagKey(tag);
}

/** Cleans a tag list coming from a draft or storage: trimmed, no "#", unique, capped. */
export function sanitizeTags(raw: unknown, max = MAX_POST_TAGS): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const tag = item.replace(/^#+/, "").trim().toLowerCase().slice(0, TAG_MAX_LENGTH);
    if (tag.length < 2 || seen.has(tagKey(tag))) continue;
    seen.add(tagKey(tag));
    out.push(tag);
    if (out.length >= max) break;
  }
  return out;
}
