import { isCategoriaId } from "@/lib/desejos/categorias";
import { PERGUNTAS } from "@/lib/desejos/perguntas";
import { respostaValida } from "@/lib/desejos/pontuacao";
import type { CategoriaId, EstadoDesejos, ProgressoDesejos, Resposta } from "@/lib/desejos/types";
import { applyVote, buildPost, MODERATION_TEAM, validateDraft, type CommunitySort } from "@/lib/community";
import { hasTalked, recordLine, SEED_CONVERSATIONS, type Conversations, type Speaker } from "@/lib/conversas";
import { INTENTIONS } from "@/lib/data/intentions";
import type { Point } from "@/lib/data/park";
import { getMoldura, isMolduraId, type MolduraId } from "@/lib/molduras/catalogo";
import { ORBIT_PLUS } from "@/lib/molduras/config";
import { aplicarConquistas, ESTADO_MOLDURAS_INICIAL, type EstadoMolduras } from "@/lib/molduras/estado";
import { COMMUNITY_POSTS } from "@/lib/data/posts";
import { TOPIC_IDS } from "@/lib/data/profileOptions";
import { ORBIT_PROFILES } from "@/lib/data/profiles";
import { DEFAULT_REGION, isRegionId } from "@/lib/data/regions";
import { DEMO_USER } from "@/lib/data/user";
import type { InteresseTab } from "@/lib/interesse";
import { EMPTY_FILTERS, type OrbitaFilters, type OrbitaSort } from "@/lib/orbitaFilters";
import type {
  AppId,
  CommunityCategory,
  CommunityPost,
  IntentionId,
  PostDraft,
  PostKind,
  RegionId,
  TabId,
  TopicId,
  UserProfile,
} from "@/lib/types";

export type OrbitaFilter = "all" | IntentionId;
export type CommunityFilter = "all" | CommunityCategory;

export interface MiniChatState {
  profileId: string;
  /** Viewport point of the bubble that opened it, so the chat can grow out of it. */
  origin: Point | null;
}

export interface OrbitState {
  user: UserProfile;
  posts: CommunityPost[];
  foundPacoca: boolean;
  activeTab: TabId;
  orbitaViewMode: "radial" | "conexoes" | "lista";
  /** Last line from each side per profile; never persisted on the device. */
  conversations: Conversations;
  miniChat: MiniChatState | null;
  orbitaFilter: OrbitaFilter;
  orbitaFilters: OrbitaFilters;
  orbitaSort: OrbitaSort;
  orbitaFiltersOpen: boolean;
  communityFilter: CommunityFilter;
  communitySort: CommunitySort;
  regionId: RegionId;
  interesseTab: InteresseTab;
  /** Profiles the user tapped, newest first. */
  sentTaps: string[];
  /** 0: Órbita, 1: Parque, 2: Meu Cartão */
  watchPage: 0 | 1 | 2;
  selectedProfileId: string | null;
  selectedArticleId: string | null;
  composerKind: PostKind | null;
  showDesktopDpad: boolean;
  /** Room the user is walking in; null shows the Parque world map. */
  parkRoomId: string | null;
  desejos: ProgressoDesejos;
  /** Desire categories shown on the profile: opt-in, one by one, empty by default. */
  desejosPublicos: CategoriaId[];
  desejosTela: "intro" | "quiz" | "resultado";
  /** Category whose explanation sheet is open. */
  desejoAberto: CategoriaId | null;
  /** Frame around the user's own avatar ring; unlocked frames grow with activity. */
  molduras: EstadoMolduras;
  /** Frames earned by the last action, for the unlock toast; never persisted. */
  moldurasNovas: MolduraId[];
}

export type DesejosTela = OrbitState["desejosTela"];

export type OrbitAction =
  | { type: "hydrateUser"; user: UserProfile }
  | { type: "setTab"; tab: TabId }
  | { type: "resetHome" }
  | { type: "setOrbitaViewMode"; mode: OrbitState["orbitaViewMode"] }
  | { type: "setOrbitaFilter"; filter: OrbitaFilter }
  | { type: "updateOrbitaFilters"; patch: Partial<OrbitaFilters> }
  | { type: "clearOrbitaFilters" }
  | { type: "setOrbitaSort"; sort: OrbitaSort }
  | { type: "openOrbitaFilters" }
  | { type: "setCommunityFilter"; filter: CommunityFilter }
  | { type: "setCommunitySort"; sort: CommunitySort }
  | { type: "setRegion"; regionId: string }
  | { type: "setInteresseTab"; tab: InteresseTab }
  | { type: "tapProfile"; id: string }
  | { type: "hydrateTaps"; ids: unknown }
  | { type: "setWatchPage"; page: OrbitState["watchPage"] }
  | { type: "openProfile"; id: string }
  | { type: "openMiniChat"; id: string; origin?: Point | null }
  | { type: "recordLine"; id: string; from: Speaker; text: string }
  | { type: "openArticle"; id: string }
  | { type: "openComposer"; kind: PostKind }
  | { type: "closeModals" }
  | { type: "toggleDesktopDpad" }
  | { type: "enterParkRoom"; id: string }
  | { type: "leaveParkRoom" }
  | { type: "foundPacoca" }
  | { type: "togglePrivacy" }
  | { type: "updateBio"; bio: string }
  | { type: "toggleIntention"; id: IntentionId }
  | { type: "setPrimaryIntention"; id: IntentionId }
  | { type: "toggleApp"; id: AppId }
  | { type: "updateAppHandle"; id: AppId; handle: string }
  | { type: "toggleTopic"; id: TopicId }
  | { type: "votePost"; id: string; direction: 1 | -1 }
  | { type: "addComment"; id: string; text: string }
  | { type: "submitPost"; draft: PostDraft }
  | { type: "approveArticle"; id: string }
  | { type: "hydrateDesejos"; estado: EstadoDesejos }
  | { type: "setDesejosTela"; tela: DesejosTela }
  | { type: "responderDesejo"; perguntaId: string; resposta: Resposta }
  | { type: "limparRespostaDesejo"; perguntaId: string }
  | { type: "irParaPergunta"; passo: number }
  | { type: "concluirDesejos" }
  | { type: "refazerDesejos" }
  | { type: "apagarDesejos" }
  | { type: "toggleDesejoPublico"; id: CategoriaId }
  | { type: "abrirDesejo"; id: CategoriaId }
  | { type: "usarMoldura"; id: MolduraId }
  | { type: "desbloquearOrbitPlus"; id: MolduraId }
  | { type: "hydrateMolduras"; estado: EstadoMolduras };

export const BIO_MAX_LENGTH = 160;
export const COMMENT_MAX_LENGTH = 500;
export const TOPICS_MAX = 8;

export function createInitialState(): OrbitState {
  return comConquistas({
    user: structuredClone(DEMO_USER),
    posts: structuredClone(COMMUNITY_POSTS),
    foundPacoca: false,
    activeTab: "orbita",
    orbitaViewMode: "radial",
    conversations: SEED_CONVERSATIONS,
    miniChat: null,
    orbitaFilter: "all",
    orbitaFilters: structuredClone(EMPTY_FILTERS),
    orbitaSort: "proximidade",
    orbitaFiltersOpen: false,
    communityFilter: "all",
    communitySort: "hot",
    regionId: DEFAULT_REGION,
    interesseTab: "visualizacoes",
    sentTaps: [],
    watchPage: 0,
    selectedProfileId: null,
    selectedArticleId: null,
    composerKind: null,
    showDesktopDpad: false,
    parkRoomId: null,
    desejos: { respostas: {}, passo: 0, concluido: false },
    desejosPublicos: [],
    desejosTela: "intro",
    desejoAberto: null,
    molduras: ESTADO_MOLDURAS_INICIAL,
    moldurasNovas: [],
  });
}

/** Unlocks the frames the user's activity has earned, after every action. */
function comConquistas(state: OrbitState): OrbitState {
  const molduras = aplicarConquistas(state.molduras, {
    foundPacoca: state.foundPacoca,
    conversations: state.conversations,
    posts: state.posts,
    desejosConcluido: state.desejos.concluido,
    sentTaps: state.sentTaps,
    topicos: state.user.topics.length,
    parkRoomId: state.parkRoomId,
  });
  if (molduras === state.molduras) return state;
  return { ...state, molduras, moldurasNovas: molduras.desbloqueadas.slice(state.molduras.desbloqueadas.length) };
}

export function orbitReducer(state: OrbitState, action: OrbitAction): OrbitState {
  const next = baseReducer(state, action);
  return next === state ? state : comConquistas(next);
}

function isIntention(value: unknown): value is IntentionId {
  return typeof value === "string" && Object.hasOwn(INTENTIONS, value);
}

const PROFILE_IDS = new Set(ORBIT_PROFILES.map((p) => p.id));

function isTopic(value: unknown): value is TopicId {
  return typeof value === "string" && TOPIC_IDS.has(value);
}

/**
 * Validates a hub restored from storage and fills anything missing with demo
 * defaults, so older or tampered payloads can't break the UI.
 */
export function sanitizeStoredUser(raw: unknown): UserProfile | null {
  if (typeof raw !== "object" || raw === null) return null;
  const data = raw as Record<string, unknown>;
  const base = structuredClone(DEMO_USER);
  const intentions = Array.isArray(data.intentions) ? [...new Set(data.intentions.filter(isIntention))] : [];
  if (!intentions.length) return null;
  const primaryIntention =
    isIntention(data.primaryIntention) && intentions.includes(data.primaryIntention)
      ? data.primaryIntention
      : intentions[0];

  const storedApps = typeof data.apps === "object" && data.apps !== null ? (data.apps as Record<string, unknown>) : {};
  const apps = { ...base.apps };
  for (const id of Object.keys(apps) as AppId[]) {
    const app = storedApps[id] as { active?: unknown; handle?: unknown } | undefined;
    if (!app || typeof app !== "object") continue;
    apps[id] = {
      active: typeof app.active === "boolean" ? app.active : apps[id].active,
      handle: typeof app.handle === "string" ? app.handle.slice(0, 40) : apps[id].handle,
    };
  }

  return {
    ...base,
    isPublic: typeof data.isPublic === "boolean" ? data.isPublic : base.isPublic,
    bio: typeof data.bio === "string" ? data.bio.slice(0, BIO_MAX_LENGTH) : base.bio,
    intentions,
    primaryIntention,
    apps,
    topics: Array.isArray(data.topics) ? [...new Set(data.topics.filter(isTopic))].slice(0, TOPICS_MAX) : base.topics,
  };
}

/** Keeps only known profile ids from storage, once each. */
export function sanitizeStoredTaps(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((id): id is string => typeof id === "string" && PROFILE_IDS.has(id)))];
}

const closed = {
  selectedProfileId: null,
  selectedArticleId: null,
  composerKind: null,
  orbitaFiltersOpen: false,
  miniChat: null,
  desejoAberto: null,
} as const;

function baseReducer(state: OrbitState, action: OrbitAction): OrbitState {
  switch (action.type) {
    case "hydrateUser":
      return { ...state, user: action.user };
    case "setTab":
      return { ...state, ...closed, activeTab: action.tab };
    case "resetHome":
      return { ...state, ...closed, activeTab: "orbita", orbitaViewMode: "radial", orbitaFilter: "all", watchPage: 0 };
    case "setOrbitaViewMode":
      return { ...state, orbitaViewMode: action.mode };
    case "setOrbitaFilter":
      return { ...state, orbitaFilter: action.filter };
    case "updateOrbitaFilters":
      return { ...state, orbitaFilters: { ...state.orbitaFilters, ...action.patch } };
    case "clearOrbitaFilters":
      return { ...state, orbitaFilters: structuredClone(EMPTY_FILTERS) };
    case "setOrbitaSort":
      return { ...state, orbitaSort: action.sort };
    case "openOrbitaFilters":
      return { ...state, ...closed, orbitaFiltersOpen: true };
    case "setCommunityFilter":
      return { ...state, communityFilter: action.filter };
    case "setCommunitySort":
      return { ...state, communitySort: action.sort };
    case "setRegion":
      return isRegionId(action.regionId) ? { ...state, regionId: action.regionId } : state;
    case "setInteresseTab":
      return { ...state, interesseTab: action.tab };
    case "tapProfile":
      if (!PROFILE_IDS.has(action.id) || state.sentTaps.includes(action.id)) return state;
      return { ...state, sentTaps: [action.id, ...state.sentTaps] };
    case "hydrateTaps":
      return { ...state, sentTaps: sanitizeStoredTaps(action.ids) };
    case "setWatchPage":
      return { ...state, selectedProfileId: null, miniChat: null, watchPage: action.page };
    case "openProfile":
      return { ...state, ...closed, selectedProfileId: action.id };
    case "openMiniChat":
      if (!hasTalked(state.conversations[action.id])) return state;
      return { ...state, ...closed, miniChat: { profileId: action.id, origin: action.origin ?? null } };
    case "recordLine": {
      const conversations = recordLine(state.conversations, action.id, action.from, action.text);
      return conversations === state.conversations ? state : { ...state, conversations };
    }
    case "openArticle":
      return { ...state, ...closed, selectedArticleId: action.id };
    case "openComposer":
      return { ...state, ...closed, composerKind: action.kind };
    case "closeModals":
      return { ...state, ...closed };
    case "toggleDesktopDpad":
      return { ...state, showDesktopDpad: !state.showDesktopDpad };
    case "enterParkRoom":
      return { ...state, parkRoomId: action.id };
    case "leaveParkRoom":
      return { ...state, parkRoomId: null };
    case "foundPacoca":
      return state.foundPacoca ? state : { ...state, foundPacoca: true };
    case "togglePrivacy":
      return { ...state, user: { ...state.user, isPublic: !state.user.isPublic } };
    case "updateBio":
      return { ...state, user: { ...state.user, bio: action.bio.slice(0, BIO_MAX_LENGTH) } };
    case "toggleIntention": {
      const { intentions, primaryIntention } = state.user;
      if (!intentions.includes(action.id)) {
        return { ...state, user: { ...state.user, intentions: [...intentions, action.id] } };
      }
      // At least one intention must stay active so the orbit ring always has a color.
      if (intentions.length <= 1) return state;
      const next = intentions.filter((i) => i !== action.id);
      return {
        ...state,
        user: {
          ...state.user,
          intentions: next,
          primaryIntention: primaryIntention === action.id ? next[0] : primaryIntention,
        },
      };
    }
    case "setPrimaryIntention": {
      const intentions = state.user.intentions.includes(action.id)
        ? state.user.intentions
        : [...state.user.intentions, action.id];
      return { ...state, user: { ...state.user, intentions, primaryIntention: action.id } };
    }
    case "toggleApp": {
      const app = state.user.apps[action.id];
      return {
        ...state,
        user: { ...state.user, apps: { ...state.user.apps, [action.id]: { ...app, active: !app.active } } },
      };
    }
    case "updateAppHandle": {
      const app = state.user.apps[action.id];
      return {
        ...state,
        user: {
          ...state.user,
          apps: { ...state.user.apps, [action.id]: { ...app, handle: action.handle.slice(0, 40) } },
        },
      };
    }
    case "toggleTopic": {
      const { topics } = state.user;
      if (!topics.includes(action.id) && topics.length >= TOPICS_MAX) return state;
      const next = topics.includes(action.id) ? topics.filter((t) => t !== action.id) : [...topics, action.id];
      return { ...state, user: { ...state.user, topics: next } };
    }
    case "votePost":
      return { ...state, posts: state.posts.map((p) => (p.id === action.id ? applyVote(p, action.direction) : p)) };
    case "addComment": {
      const text = action.text.trim().slice(0, COMMENT_MAX_LENGTH);
      if (!text) return state;
      return {
        ...state,
        posts: state.posts.map((p) =>
          p.id === action.id
            ? { ...p, comments: [...p.comments, { author: state.user.name, time: "agora", text, local: true }] }
            : p,
        ),
      };
    }
    case "submitPost": {
      if (validateDraft(action.draft).length) return state;
      const post = buildPost(action.draft, `u${state.posts.length + 1}`, state.user.name);
      return {
        ...state,
        ...closed,
        posts: [post, ...state.posts],
        communityFilter: "all",
        communitySort: "new",
        selectedArticleId: post.id,
      };
    }
    case "approveArticle":
      return {
        ...state,
        posts: state.posts.map((p) =>
          p.id === action.id && p.kind === "artigo" && p.status === "em_revisao"
            ? { ...p, status: "publicado", reviewedBy: MODERATION_TEAM }
            : p,
        ),
      };
    case "hydrateDesejos": {
      const { publicos, ...desejos } = action.estado;
      return { ...state, desejos, desejosPublicos: publicos, desejosTela: desejos.concluido ? "resultado" : "intro" };
    }
    case "setDesejosTela":
      return { ...state, ...closed, desejosTela: action.tela };
    case "responderDesejo": {
      const pergunta = PERGUNTAS.find((p) => p.id === action.perguntaId);
      if (!pergunta || !respostaValida(pergunta, action.resposta)) return state;
      return {
        ...state,
        desejos: { ...state.desejos, respostas: { ...state.desejos.respostas, [pergunta.id]: action.resposta } },
      };
    }
    case "limparRespostaDesejo": {
      if (!Object.hasOwn(state.desejos.respostas, action.perguntaId)) return state;
      const respostas = { ...state.desejos.respostas };
      delete respostas[action.perguntaId];
      return { ...state, desejos: { ...state.desejos, respostas } };
    }
    case "irParaPergunta":
      return {
        ...state,
        desejos: { ...state.desejos, passo: Math.min(Math.max(action.passo, 0), PERGUNTAS.length - 1) },
      };
    case "concluirDesejos":
      return { ...state, desejos: { ...state.desejos, concluido: true }, desejosTela: "resultado" };
    case "refazerDesejos":
      return { ...state, ...closed, desejos: { respostas: {}, passo: 0, concluido: false }, desejosTela: "quiz" };
    case "apagarDesejos":
      return {
        ...state,
        ...closed,
        desejos: { respostas: {}, passo: 0, concluido: false },
        desejosPublicos: [],
        desejosTela: "intro",
      };
    case "toggleDesejoPublico": {
      if (!isCategoriaId(action.id)) return state;
      const { desejosPublicos } = state;
      return {
        ...state,
        desejosPublicos: desejosPublicos.includes(action.id)
          ? desejosPublicos.filter((id) => id !== action.id)
          : [...desejosPublicos, action.id],
      };
    }
    case "abrirDesejo":
      return isCategoriaId(action.id) ? { ...state, ...closed, desejoAberto: action.id } : state;
    case "usarMoldura": {
      const { molduras } = state;
      if (!molduras.desbloqueadas.includes(action.id) || molduras.ativa === action.id) return state;
      return { ...state, molduras: { ...molduras, ativa: action.id } };
    }
    case "desbloquearOrbitPlus": {
      const { molduras } = state;
      if (!isMolduraId(action.id) || molduras.desbloqueadas.includes(action.id)) return state;
      if (ORBIT_PLUS.modo !== "simulado" || getMoldura(action.id).desbloqueio.tipo !== "orbitPlus") return state;
      return { ...state, molduras: { ativa: action.id, desbloqueadas: [...molduras.desbloqueadas, action.id] } };
    }
    case "hydrateMolduras": {
      const desbloqueadas = [...new Set([...state.molduras.desbloqueadas, ...action.estado.desbloqueadas])];
      const ativa = desbloqueadas.includes(action.estado.ativa) ? action.estado.ativa : state.molduras.ativa;
      return { ...state, molduras: { ativa, desbloqueadas } };
    }
    default:
      return state;
  }
}
