import { profileById } from "@/lib/data/profiles";

export type Speaker = "me" | "them";

/**
 * What the user can see of a conversation: only the last line from each side.
 * `null` means that side has not said anything yet (rendered as an empty balloon).
 */
export interface Conversation {
  mine: string | null;
  theirs: string | null;
}

export type Conversations = Readonly<Record<string, Conversation>>;

export const MINI_CHAT_MAX_LENGTH = 75;

/** Simulated exchanges so the radar already shows who the user has talked to. */
export const SEED_CONVERSATIONS: Conversations = {
  p1: { mine: "Achou o Paçoca?", theirs: "Ainda não! Se vir um gato laranja, me avisa 🐱" },
  p19: { mine: "Seu show de sexta foi incrível!", theirs: "Obrigada!! Semana que vem tem outro 🎤" },
  p2: { mine: "Bora treinar amanhã cedo?", theirs: null },
  p3: { mine: "Viu o filme novo do Almodóvar?", theirs: "Vi ontem, preciso comentar com alguém urgente" },
  p20: { mine: "Oi! Curti sua bio", theirs: null },
  p5: { mine: null, theirs: "Ei, te vi no Parque. Curte eletrônica?" },
  p7: { mine: "Valeu pela dica do brechó!", theirs: "Imagina! Depois me mostra o que achou" },
  p32: { mine: "Tem roda de conversa sábado?", theirs: null },
};

/** Keeps only the newest line of the speaker; older lines are never kept on the device. */
export function recordLine(
  conversations: Conversations,
  profileId: string,
  from: Speaker,
  text: string,
): Conversations {
  const line = text.trim().slice(0, MINI_CHAT_MAX_LENGTH);
  if (!line || !profileById(profileId)) return conversations;
  const current = conversations[profileId] ?? { mine: null, theirs: null };
  const next = from === "me" ? { ...current, mine: line } : { ...current, theirs: line };
  if (next.mine === current.mine && next.theirs === current.theirs && conversations[profileId]) return conversations;
  return { ...conversations, [profileId]: next };
}

export function hasTalked(conversation: Conversation | undefined): conversation is Conversation {
  return Boolean(conversation && (conversation.mine || conversation.theirs));
}
