import { applyVote, buildPost, MODERATION_TEAM, validateDraft, type CommunitySort } from "@/lib/community";
import { INTENTIONS } from "@/lib/data/intentions";
import { COMMUNITY_POSTS } from "@/lib/data/posts";
import { TOPIC_IDS } from "@/lib/data/profileOptions";
import { SIMULATED_PROFILES } from "@/lib/data/profiles";
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

export interface OrbitState {
  user: UserProfile;
  posts: CommunityPost[];
  foundPacoca: boolean;
  activeTab: TabId;
  orbitaViewMode: "radial" | "lista";
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
}

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
  | { type: "approveArticle"; id: string };

export const BIO_MAX_LENGTH = 160;
export const COMMENT_MAX_LENGTH = 500;
export const TOPICS_MAX = 8;

export function createInitialState(): OrbitState {
  return {
    user: structuredClone(DEMO_USER),
    posts: structuredClone(COMMUNITY_POSTS),
    foundPacoca: false,
    activeTab: "orbita",
    orbitaViewMode: "radial",
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
  };
}

function isIntention(value: unknown): value is IntentionId {
  return typeof value === "string" && Object.hasOwn(INTENTIONS, value);
}

const PROFILE_IDS = new Set(SIMULATED_PROFILES.map((p) => p.id));

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
} as const;

export function orbitReducer(state: OrbitState, action: OrbitAction): OrbitState {
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
      return { ...state, selectedProfileId: null, watchPage: action.page };
    case "openProfile":
      return { ...state, ...closed, selectedProfileId: action.id };
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
    default:
      return state;
  }
}
