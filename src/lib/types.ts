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

export type GenderId =
  "homem-cis" | "homem-trans" | "mulher-cis" | "mulher-trans" | "travesti" | "nao-binarie" | "genero-fluido";
export type Pronouns = "ele" | "ela" | "elu";
export type OrientationId = "gay" | "lesbica" | "bi" | "pan" | "queer" | "hetero" | "assexual";
export type TribeId =
  | "bear"
  | "otter"
  | "twink"
  | "jock"
  | "geek"
  | "daddy"
  | "leather"
  | "discreto"
  | "trans"
  | "clean-cut"
  | "rugged"
  | "poz"
  | "sem-tribo";
export type LookingForId = "amizade" | "troca" | "namoro" | "casual" | "agora" | "networking";
export type PositionId = "ativo" | "vers-ativo" | "versatil" | "vers-passivo" | "passivo" | "side";
export type SportId =
  | "futebol"
  | "volei"
  | "corrida"
  | "musculacao"
  | "natacao"
  | "yoga"
  | "ciclismo"
  | "crossfit"
  | "danca"
  | "trilha"
  | "lutas"
  | "skate";
export type RelationshipId = "solteiro" | "namorando" | "casado" | "aberto";
export type MeetPlaceId = "minha-casa" | "sua-casa" | "bar" | "restaurante" | "cafe" | "online";
export type CondomUse = "sempre" | "as-vezes" | "prefiro-nao-dizer";
export type HivStatus = "negativo" | "positivo-indetectavel" | "positivo" | "prefiro-nao-dizer";
export type TopicId =
  | "cinema"
  | "series"
  | "musica-eletronica"
  | "mpb"
  | "pop"
  | "kpop"
  | "games"
  | "anime"
  | "livros"
  | "politica"
  | "tecnologia"
  | "design"
  | "moda"
  | "gastronomia"
  | "viagens"
  | "fotografia"
  | "arte"
  | "teatro"
  | "drag"
  | "astrologia"
  | "pets"
  | "plantas"
  | "cafe"
  | "cerveja"
  | "vinho"
  | "natureza"
  | "ativismo"
  | "saude-mental"
  | "carreira"
  | "idiomas"
  | "ciencia"
  | "esportes";

/** Self-declared and optional; an absent field means "not informed". */
export interface SexualHealth {
  prep?: boolean;
  condom?: CondomUse;
  /** Month of the last test, "YYYY-MM". */
  lastTest?: string;
  status?: HivStatus;
}

export interface Profile {
  id: string;
  name: string;
  age: number;
  dist: string;
  distanceM: number;
  online: boolean;
  inPark: boolean;
  primaryIntention: IntentionId;
  intentions: IntentionId[];
  bio: string;
  avatar: AvatarConfig;
  /** File in `public/profiles/`; the illustrated avatar is the fallback. */
  photo?: string;
  apps: Partial<Record<AppId, AppPresence>>;
  city: string;
  gender: GenderId;
  pronouns: Pronouns;
  orientation: OrientationId;
  heightCm?: number;
  weightKg?: number;
  tribes: TribeId[];
  lookingFor: LookingForId[];
  position?: PositionId;
  sports: SportId[];
  relationship?: RelationshipId;
  acceptsNsfw?: boolean;
  meetAt: MeetPlaceId[];
  health: SexualHealth;
  topics: TopicId[];
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
  topics: TopicId[];
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
