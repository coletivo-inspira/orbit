export type IntentionId = "troca" | "amizade" | "casual" | "namoro" | "apoio";
export type AppId = "grindr" | "scruff" | "tinder" | "bumble" | "insta" | "spotify";
export type DeviceKind = "desktop" | "mobile" | "watch";
export type TabId = "orbita" | "parque" | "comunidade" | "perfil";
export type CommunityCategory = "vacinas" | "prevencao" | "bemestar" | "debates";

export interface Intention {
  id: IntentionId;
  label: string;
  short: string;
  emoji: string;
  /** Ring and dot color. */
  color: string;
  /** Lighter shade for chip text: at least 4.5:1 on its tinted background. */
  text: string;
  bg: string;
  border: string;
}

export interface ExternalApp {
  id: AppId;
  name: string;
  bg: string;
  textColor: string;
  /** Closed apps (no shareable profile link) only show a presence badge. */
  noExternalLink: boolean;
  desc: string;
}

export interface AvatarConfig {
  bg: string;
  skin: string;
  hair: string;
  shirt: string;
  accessory: "glasses" | "beard" | "cap" | "none";
}

export interface AppPresence {
  active: boolean;
  handle?: string;
}

export interface Profile {
  id: string;
  name: string;
  age: number;
  dist: string;
  online: boolean;
  inPark: boolean;
  primaryIntention: IntentionId;
  intentions: IntentionId[];
  bio: string;
  avatar: AvatarConfig;
  apps: Partial<Record<AppId, AppPresence>>;
}

export interface UserProfile {
  name: string;
  firstName: string;
  age: number;
  handle: string;
  city: string;
  isPublic: boolean;
  primaryIntention: IntentionId;
  intentions: IntentionId[];
  bio: string;
  avatar: AvatarConfig;
  apps: Record<AppId, { active: boolean; handle: string }>;
}

export interface PostComment {
  author: string;
  time: string;
  text: string;
  /** Written in this session (Modo Explorar); never published. */
  local?: boolean;
}

/** A paragraph, or a semantic list instead of typed bullets. */
export type ArticleBlock = string | { list: "ul" | "ol"; items: string[] };

export interface ArticleSource {
  label: string;
  url: string;
}

export interface CommunityPost {
  id: string;
  category: CommunityCategory;
  title: string;
  summary: string;
  author: string;
  date: string;
  readTime: string;
  likes: number;
  liked: boolean;
  content: ArticleBlock[];
  /** Editorial review date; left empty until the team reviews the health content. */
  reviewedAt?: string;
  sources?: ArticleSource[];
  comments: PostComment[];
}
