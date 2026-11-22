import { INTENTION_LIST } from "@/lib/data/intentions";
import {
  BODY_TYPES,
  CONDOM_USE,
  formatDistance,
  LOOKING_FOR,
  MEET_PLACES,
  POSITIONS,
  SPORTS,
  TOPICS,
  TRIBES,
} from "@/lib/data/profileOptions";
import type {
  AppId,
  AppPresence,
  AvatarConfig,
  GenderId,
  HivStatus,
  IntentionId,
  OrientationId,
  Profile,
  Pronouns,
  RelationshipId,
  TribeId,
} from "@/lib/types";

/** How many illustrated profiles fill the Órbita around the 48 curated ones. */
export const GENERATED_PROFILE_COUNT = 1200;

/** Generated profiles start after the farthest curated one, so the photo portraits stay near the center. */
const FIRST_DISTANCE_M = 4500;

type Rand = () => number;

function mulberry32(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(rand: Rand, items: readonly T[]): T => items[Math.floor(rand() * items.length)];

function weighted<T>(rand: Rand, entries: readonly (readonly [T, number])[]): T {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [value, w] of entries) {
    r -= w;
    if (r < 0) return value;
  }
  return entries[entries.length - 1][0];
}

function sample<T>(rand: Rand, items: readonly T[], min: number, max: number): T[] {
  const n = min + Math.floor(rand() * (max - min + 1));
  const pool = [...items];
  const out: T[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  return out;
}

const GENDER_WEIGHTS: readonly (readonly [GenderId, number])[] = [
  ["homem-cis", 38],
  ["mulher-cis", 18],
  ["nao-binarie", 12],
  ["mulher-trans", 9],
  ["genero-fluido", 8],
  ["homem-trans", 8],
  ["travesti", 7],
];

const PRONOUNS_BY_GENDER: Record<GenderId, Pronouns> = {
  "homem-cis": "ele",
  "homem-trans": "ele",
  "mulher-cis": "ela",
  "mulher-trans": "ela",
  travesti: "ela",
  "nao-binarie": "elu",
  "genero-fluido": "elu",
};

const NAMES: Record<Pronouns, readonly string[]> = {
  ele: [
    "Lucas",
    "Gabriel",
    "Pedro",
    "Rafael",
    "João",
    "Davi",
    "Arthur",
    "Enzo",
    "Murilo",
    "Vinícius",
    "Henrique",
    "Caio",
    "Igor",
    "Otávio",
    "Renan",
    "Wesley",
    "Breno",
    "Danilo",
    "Ícaro",
    "Marcelo",
    "Tiago",
    "Yuri",
    "Fábio",
    "Hugo",
    "Leandro",
    "Márcio",
    "Paulo",
    "Ruan",
    "Samuel",
    "Vitor",
    "Wagner",
    "Zeca",
  ],
  ela: [
    "Ana",
    "Beatriz",
    "Carol",
    "Débora",
    "Elisa",
    "Fernanda",
    "Giovana",
    "Helena",
    "Isabela",
    "Júlia",
    "Karina",
    "Larissa",
    "Manu",
    "Natália",
    "Olívia",
    "Priscila",
    "Raquel",
    "Sabrina",
    "Tainá",
    "Valéria",
    "Yara",
    "Bruna",
    "Clara",
    "Duda",
    "Flávia",
    "Gabi",
    "Ingrid",
    "Lívia",
    "Maya",
    "Rebeca",
    "Sofia",
    "Thaís",
  ],
  elu: [
    "Alex",
    "Ariel",
    "Cris",
    "Dani",
    "Jules",
    "Kim",
    "Luca",
    "Noa",
    "Rê",
    "Sam",
    "Tai",
    "Val",
    "Jô",
    "Mika",
    "Nic",
    "Robin",
    "Sasha",
    "Teo",
    "Ali",
    "Juno",
  ],
};

const INITIALS = "ABCDFGHJLMNOPRSTV";

const NEIGHBORHOODS = [
  "Savassi",
  "Funcionários",
  "Lourdes",
  "Santa Tereza",
  "Floresta",
  "Centro",
  "Sion",
  "Serra",
  "Prado",
  "Barro Preto",
  "Santo Antônio",
  "Buritis",
  "Pampulha",
  "Cidade Nova",
  "Gutierrez",
  "Lagoinha",
  "Anchieta",
  "Cruzeiro",
  "Santa Efigênia",
  "Carlos Prates",
  "Venda Nova",
  "Barreiro",
  "Belvedere",
  "Mangabeiras",
];

const HOME_CITIES = ["Rio de Janeiro", "Recife", "Curitiba", "Fortaleza", "Porto Alegre", "Montevidéu", "Madri"];

const BIO_OPENERS = ["Por aqui pra", "Topo", "Curto", "Sempre a fim de", "Bora", "Procurando gente pra"];
const BIO_ACTIVITIES = [
  "um café sem pressa",
  "trocar indicação de série",
  "um rolê no Mercado Central",
  "caminhar na Pampulha",
  "show pequeno em Santa Tereza",
  "conversar sobre tudo e nada",
  "um karaokê bem desafinado",
  "feirinha de domingo",
];
const BIO_CLOSERS = ["Sem pressa.", "Respeito acima de tudo.", "Chama!", "Sou de boa.", "Bom humor é obrigatório."];

const AVATAR_BG = ["#1e3a8a", "#7c2d12", "#14532d", "#4c1d95", "#831843", "#0c4a6e", "#3f3f46", "#713f12"];
const AVATAR_SKIN = ["#ffdbac", "#f1c27d", "#e0ac69", "#c68642", "#8d5524", "#5c3a21"];
const AVATAR_HAIR = ["#111827", "#1f2937", "#451a03", "#78350f", "#a16207", "#e5e7eb", "#be185d", "#4338ca"];
const AVATAR_SHIRT = ["#38bdf8", "#fb923c", "#34d399", "#a78bfa", "#f472b6", "#facc15", "#f87171", "#e2e8f0"];
const ACCESSORIES: readonly (readonly [AvatarConfig["accessory"], number])[] = [
  ["none", 6],
  ["glasses", 2],
  ["beard", 2],
  ["cap", 1],
];

const PRESENCE_APPS: AppId[] = ["grindr", "scruff", "tinder", "bumble"];
const TRIBE_POOL = TRIBES.map((t) => t.id).filter((id) => id !== "trans" && id !== "poz" && id !== "sem-tribo");
const RELATIONSHIPS: RelationshipId[] = ["solteiro", "solteiro", "solteiro", "namorando", "aberto", "casado"];
const STATUSES: HivStatus[] = ["negativo", "negativo", "positivo-indetectavel", "prefiro-nao-dizer"];

function orientationFor(rand: Rand, gender: GenderId): OrientationId {
  if (gender === "homem-cis" || gender === "homem-trans") {
    return weighted(rand, [
      ["gay", 7],
      ["bi", 2],
      ["queer", 1],
      ["pan", 1],
    ]);
  }
  if (gender === "mulher-cis")
    return weighted(rand, [
      ["lesbica", 6],
      ["bi", 3],
      ["pan", 1],
      ["queer", 1],
    ]);
  if (gender === "mulher-trans" || gender === "travesti") {
    return weighted(rand, [
      ["hetero", 3],
      ["bi", 2],
      ["lesbica", 2],
      ["pan", 1],
      ["queer", 1],
    ]);
  }
  return weighted(rand, [
    ["queer", 4],
    ["pan", 3],
    ["bi", 2],
    ["assexual", 1],
  ]);
}

function handleFor(name: string, n: number): string {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return `@${base}.${(n * 37) % 1000}`;
}

function generateProfile(rand: Rand, n: number, nameCount: Map<string, number>): Profile {
  const gender = weighted(rand, GENDER_WEIGHTS);
  const pronouns = PRONOUNS_BY_GENDER[gender];
  const first = pick(rand, NAMES[pronouns]);
  const seen = nameCount.get(first) ?? 0;
  nameCount.set(first, seen + 1);
  const name = seen === 0 ? first : `${first} ${INITIALS[(seen + n) % INITIALS.length]}.`;

  const intentions = sample(
    rand,
    INTENTION_LIST.map((i) => i.id),
    1,
    3,
  ) as IntentionId[];
  const distanceM = Math.round(FIRST_DISTANCE_M + n * 19 + rand() * 380);
  const trans = gender === "mulher-trans" || gender === "homem-trans" || gender === "travesti";
  const tribes: TribeId[] = sample(rand, TRIBE_POOL, 0, 2);
  if (trans && rand() < 0.5) tribes.push("trans");
  if (!tribes.length) tribes.push("sem-tribo");

  const apps: Partial<Record<AppId, AppPresence>> = {};
  for (const id of sample(rand, PRESENCE_APPS, 0, 2)) apps[id] = { active: true };
  if (rand() < 0.35) apps.insta = { active: true, handle: handleFor(first, n) };
  if (rand() < 0.18) apps.spotify = { active: true, handle: `${handleFor(first, n).slice(1)}.fm` };

  const visiting = rand() < 0.03;
  const testMonth = 6 + Math.floor(rand() * 17);
  const lastTest =
    testMonth <= 12 ? `2025-${String(testMonth).padStart(2, "0")}` : `2026-${String(testMonth - 12).padStart(2, "0")}`;

  return {
    id: `g${n + 1}`,
    name,
    age: 18 + Math.floor(Math.pow(rand(), 1.6) * 40),
    distanceM,
    dist: formatDistance(distanceM),
    online: rand() < 0.3,
    inPark: false,
    primaryIntention: intentions[0],
    intentions,
    bio: `${pick(rand, BIO_OPENERS)} ${pick(rand, BIO_ACTIVITIES)}. ${pick(rand, BIO_CLOSERS)}`,
    avatar: {
      bg: pick(rand, AVATAR_BG),
      skin: pick(rand, AVATAR_SKIN),
      hair: pick(rand, AVATAR_HAIR),
      shirt: pick(rand, AVATAR_SHIRT),
      accessory: weighted(rand, ACCESSORIES),
    },
    apps,
    city: `${pick(rand, NEIGHBORHOODS)} · BH`,
    ...(visiting ? { visitingFrom: pick(rand, HOME_CITIES) } : {}),
    gender,
    pronouns,
    orientation: orientationFor(rand, gender),
    ...(rand() < 0.85 ? { heightCm: 155 + Math.floor(rand() * 40) } : {}),
    ...(rand() < 0.7 ? { weightKg: 50 + Math.floor(rand() * 55) } : {}),
    tribes,
    ...(rand() < 0.8 ? { bodyType: pick(rand, BODY_TYPES).id } : {}),
    photos: { face: false, album: false },
    lookingFor: sample(
      rand,
      LOOKING_FOR.map((o) => o.id),
      1,
      3,
    ),
    ...(rand() < 0.6 ? { position: pick(rand, POSITIONS).id } : {}),
    sports: sample(
      rand,
      SPORTS.map((o) => o.id),
      0,
      3,
    ),
    ...(rand() < 0.7 ? { relationship: pick(rand, RELATIONSHIPS) } : {}),
    ...(rand() < 0.75 ? { acceptsNsfw: rand() < 0.5 } : {}),
    meetAt: sample(
      rand,
      MEET_PLACES.map((o) => o.id),
      1,
      3,
    ),
    health: {
      ...(rand() < 0.5 ? { prep: rand() < 0.55 } : {}),
      ...(rand() < 0.5 ? { condom: pick(rand, CONDOM_USE).id } : {}),
      ...(rand() < 0.45 ? { lastTest } : {}),
      ...(rand() < 0.35 ? { status: pick(rand, STATUSES) } : {}),
    },
    topics: sample(
      rand,
      TOPICS.map((o) => o.id),
      3,
      6,
    ),
  };
}

/**
 * Deterministic illustrated profiles (no photo, no real faces): the same seed always
 * yields the same people, so the radar, filters and tests are stable across sessions.
 */
export function generateProfiles(count = GENERATED_PROFILE_COUNT, seed = 1248): Profile[] {
  const rand = mulberry32(seed);
  const names = new Map<string, number>();
  return Array.from({ length: count }, (_, n) => generateProfile(rand, n, names));
}
