import { INTENTIONS } from "@/lib/data/intentions";
import { COMMUNITY_POSTS } from "@/lib/data/posts";
import { DEMO_USER } from "@/lib/data/user";
import type { AppId, CommunityCategory, CommunityPost, IntentionId, TabId, UserProfile } from "@/lib/types";

export type OrbitaFilter = "all" | IntentionId;
export type CommunityFilter = "all" | CommunityCategory;

export interface OrbitState {
  user: UserProfile;
  posts: CommunityPost[];
  foundPacoca: boolean;
  activeTab: TabId;
  orbitaViewMode: "radial" | "lista";
  orbitaFilter: OrbitaFilter;
  communityFilter: CommunityFilter;
  /** 0: Órbita, 1: Parque, 2: Meu Cartão */
  watchPage: 0 | 1 | 2;
  selectedProfileId: string | null;
  selectedArticleId: string | null;
  showDesktopDpad: boolean;
}

export type OrbitAction =
  | { type: "hydrateUser"; user: UserProfile }
  | { type: "setTab"; tab: TabId }
  | { type: "resetHome" }
  | { type: "setOrbitaViewMode"; mode: OrbitState["orbitaViewMode"] }
  | { type: "setOrbitaFilter"; filter: OrbitaFilter }
  | { type: "setCommunityFilter"; filter: CommunityFilter }
  | { type: "setWatchPage"; page: OrbitState["watchPage"] }
  | { type: "openProfile"; id: string }
  | { type: "openArticle"; id: string }
  | { type: "closeModals" }
  | { type: "toggleDesktopDpad" }
  | { type: "foundPacoca" }
  | { type: "togglePrivacy" }
  | { type: "updateBio"; bio: string }
  | { type: "toggleIntention"; id: IntentionId }
  | { type: "setPrimaryIntention"; id: IntentionId }
  | { type: "toggleApp"; id: AppId }
  | { type: "updateAppHandle"; id: AppId; handle: string }
  | { type: "togglePostLike"; id: string }
  | { type: "addComment"; id: string; text: string };

export const BIO_MAX_LENGTH = 160;
export const COMMENT_MAX_LENGTH = 500;

export function createInitialState(): OrbitState {
  return {
    user: structuredClone(DEMO_USER),
    posts: structuredClone(COMMUNITY_POSTS),
    foundPacoca: false,
    activeTab: "orbita",
    orbitaViewMode: "radial",
    orbitaFilter: "all",
    communityFilter: "all",
    watchPage: 0,
    selectedProfileId: null,
    selectedArticleId: null,
    showDesktopDpad: false,
  };
}

function isIntention(value: unknown): value is IntentionId {
  return typeof value === "string" && Object.hasOwn(INTENTIONS, value);
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
  };
}

const closed = { selectedProfileId: null, selectedArticleId: null } as const;

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
    case "setCommunityFilter":
      return { ...state, communityFilter: action.filter };
    case "setWatchPage":
      return { ...state, selectedProfileId: null, watchPage: action.page };
    case "openProfile":
      return { ...state, selectedProfileId: action.id, selectedArticleId: null };
    case "openArticle":
      return { ...state, selectedArticleId: action.id, selectedProfileId: null };
    case "closeModals":
      return { ...state, ...closed };
    case "toggleDesktopDpad":
      return { ...state, showDesktopDpad: !state.showDesktopDpad };
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
    case "togglePostLike":
      return {
        ...state,
        posts: state.posts.map((p) =>
          p.id === action.id ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) } : p,
        ),
      };
    case "addComment": {
      const text = action.text.trim().slice(0, COMMENT_MAX_LENGTH);
      if (!text) return state;
      return {
        ...state,
        posts: state.posts.map((p) =>
          p.id === action.id
            ? { ...p, comments: [...p.comments, { author: state.user.name, time: "agora", text }] }
            : p,
        ),
      };
    }
    default:
      return state;
  }
}
