import { profileById } from "@/lib/data/profiles";

export type Speaker = "me" | "them";

/**
 * What the user can see of a conversation: at most two lines from each side, oldest first.
 * An empty list means that side has not said anything yet (rendered as an empty balloon).
 */
export interface Conversation {
  mine: readonly string[];
  theirs: readonly string[];
}

export type Conversations = Readonly<Record<string, Conversation>>;

export const MINI_CHAT_MAX_LENGTH = 75;
/** Visible balloons per person. A newer line drops the oldest; nothing else is kept on screen. */
export const MAX_BALLOONS_PER_SPEAKER = 2;

/** Simulated exchanges so the radar already shows who the user has talked to. */
export const SEED_CONVERSATIONS: Conversations = {
  p1: { mine: ["Achou o Paçoca?"], theirs: ["Ainda não! Se vir um gato laranja, me avisa 🐱"] },
  p19: { mine: ["Seu show de sexta foi incrível!"], theirs: ["Obrigada!! Semana que vem tem outro 🎤"] },
  p2: { mine: ["Bora treinar amanhã cedo?"], theirs: [] },
  p3: { mine: ["Viu o filme novo do Almodóvar?"], theirs: ["Vi ontem, preciso comentar com alguém urgente"] },
  p20: { mine: ["Oi! Curti sua bio"], theirs: [] },
  p5: { mine: [], theirs: ["Ei, te vi no Parque. Curte eletrônica?"] },
  p7: { mine: ["Valeu pela dica do brechó!"], theirs: ["Imagina! Depois me mostra o que achou"] },
  p32: { mine: ["Tem roda de conversa sábado?"], theirs: [] },
};

const EMPTY: Conversation = { mine: [], theirs: [] };

/** Appends a line and keeps only the newest `MAX_BALLOONS_PER_SPEAKER`. `null` when the last line is unchanged. */
function pushLine(lines: readonly string[], line: string): readonly string[] | null {
  if (lines.at(-1) === line) return null;
  const next = [...lines, line];
  return next.length > MAX_BALLOONS_PER_SPEAKER ? next.slice(-MAX_BALLOONS_PER_SPEAKER) : next;
}

/** Keeps only the newest two lines of the speaker. Older lines leave the screen and are not a history. */
export function recordLine(
  conversations: Conversations,
  profileId: string,
  from: Speaker,
  text: string,
): Conversations {
  const line = text.trim().slice(0, MINI_CHAT_MAX_LENGTH);
  if (!line || !profileById(profileId)) return conversations;
  const current = conversations[profileId] ?? EMPTY;
  const mine = from === "me" ? pushLine(current.mine, line) : current.mine;
  const theirs = from === "them" ? pushLine(current.theirs, line) : current.theirs;
  if (mine === null || theirs === null) return conversations;
  if (mine === current.mine && theirs === current.theirs && conversations[profileId]) return conversations;
  return { ...conversations, [profileId]: { mine, theirs } };
}

/** Newest visible line, for the single chip on the radar and on cards. */
export function latestLine(lines: readonly string[] | undefined): string | null {
  if (!lines || lines.length === 0) return null;
  return lines[lines.length - 1];
}

export function hasTalked(conversation: Conversation | undefined): conversation is Conversation {
  return Boolean(conversation && (conversation.mine.length > 0 || conversation.theirs.length > 0));
}
