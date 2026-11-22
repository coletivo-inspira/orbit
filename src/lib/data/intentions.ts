import type { AppId, CommunityCategory, ExternalApp, Intention, IntentionId } from "@/lib/types";

export const INTENTIONS: Record<IntentionId, Intention> = {
  troca: {
    id: "troca",
    label: "Troca de Ideia",
    short: "Troca",
    emoji: "💬",
    color: "#a78bfa",
    text: "#c4b5fd",
    bg: "rgba(167, 139, 250, 0.18)",
    border: "rgba(167, 139, 250, 0.45)",
  },
  amizade: {
    id: "amizade",
    label: "Amizade & Rolê",
    short: "Amizade",
    emoji: "🤝",
    color: "#34d399",
    text: "#6ee7b7",
    bg: "rgba(52, 211, 153, 0.18)",
    border: "rgba(52, 211, 153, 0.45)",
  },
  casual: {
    id: "casual",
    label: "Casual / Hoje",
    short: "Casual",
    emoji: "🔥",
    color: "#fb923c",
    text: "#fdba74",
    bg: "rgba(251, 146, 60, 0.18)",
    border: "rgba(251, 146, 60, 0.45)",
  },
  namoro: {
    id: "namoro",
    label: "Conhecer Alguém",
    short: "Conhecer",
    emoji: "💜",
    color: "#f472b6",
    text: "#f9a8d4",
    bg: "rgba(244, 114, 182, 0.18)",
    border: "rgba(244, 114, 182, 0.45)",
  },
  apoio: {
    id: "apoio",
    label: "Comunidade & Apoio",
    short: "Apoio",
    emoji: "🛡️",
    color: "#38bdf8",
    text: "#7dd3fc",
    bg: "rgba(56, 189, 248, 0.18)",
    border: "rgba(56, 189, 248, 0.45)",
  },
};

export const INTENTION_LIST = Object.values(INTENTIONS);

export const EXTERNAL_APPS: Record<AppId, ExternalApp> = {
  grindr: {
    id: "grindr",
    name: "Grindr",
    bg: "#f5b800",
    textColor: "#111827",
    noExternalLink: true,
    desc: "Sem link externo — exibe selo de presença ativa",
  },
  scruff: {
    id: "scruff",
    name: "Scruff",
    bg: "#2563eb",
    textColor: "#ffffff",
    noExternalLink: true,
    desc: "Sem link externo — exibe selo de presença ativa",
  },
  tinder: {
    id: "tinder",
    name: "Tinder",
    bg: "#fe3c72",
    textColor: "#ffffff",
    noExternalLink: true,
    desc: "Selo de conta ativa para matches rápidos",
  },
  bumble: {
    id: "bumble",
    name: "Bumble",
    bg: "#facc15",
    textColor: "#111827",
    noExternalLink: true,
    desc: "Selo de conta ativa no Bumble",
  },
  insta: {
    id: "insta",
    name: "Instagram",
    bg: "linear-gradient(135deg,#f59e0b,#ec4899,#8b5cf6)",
    textColor: "#ffffff",
    noExternalLink: false,
    desc: "Compartilhe seu @ do Instagram",
  },
  spotify: {
    id: "spotify",
    name: "Spotify",
    bg: "#1db954",
    textColor: "#052e16",
    noExternalLink: false,
    desc: "Mostre seu perfil musical e playlists",
  },
};

export const EXTERNAL_APP_LIST = Object.values(EXTERNAL_APPS);

export const COMMUNITY_CATEGORIES: Record<CommunityCategory, { label: string; badge: string }> = {
  vacinas: { label: "💉 Vacinas", badge: "bg-cyan-400/15 text-cyan-200 border-cyan-300/35" },
  prevencao: { label: "🛡️ Prevenção", badge: "bg-emerald-400/15 text-emerald-200 border-emerald-300/35" },
  bemestar: { label: "🧠 Saúde Mental", badge: "bg-violet-400/15 text-violet-200 border-violet-300/35" },
  debates: { label: "💬 Discussões", badge: "bg-amber-400/15 text-amber-200 border-amber-300/35" },
};

export function activeAppIds(apps: Partial<Record<AppId, { active: boolean }>>): AppId[] {
  return (Object.keys(apps) as AppId[]).filter((id) => apps[id]?.active);
}
