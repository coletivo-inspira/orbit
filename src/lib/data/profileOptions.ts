import type {
  BodyTypeId,
  CondomUse,
  GenderId,
  HivStatus,
  LookingForId,
  MeetPlaceId,
  OrientationId,
  PositionId,
  Pronouns,
  RelationshipId,
  SportId,
  TopicId,
  TribeId,
} from "@/lib/types";

export interface Option<T extends string> {
  id: T;
  label: string;
}

export const GENDERS: Option<GenderId>[] = [
  { id: "homem-cis", label: "Homem cis" },
  { id: "homem-trans", label: "Homem trans" },
  { id: "mulher-cis", label: "Mulher cis" },
  { id: "mulher-trans", label: "Mulher trans" },
  { id: "travesti", label: "Travesti" },
  { id: "nao-binarie", label: "Não binárie" },
  { id: "genero-fluido", label: "Gênero fluido" },
];

export const PRONOUNS: Record<Pronouns, string> = { ele: "ele/dele", ela: "ela/dela", elu: "elu/delu" };

export const ORIENTATIONS: Option<OrientationId>[] = [
  { id: "gay", label: "Gay" },
  { id: "lesbica", label: "Lésbica" },
  { id: "bi", label: "Bi" },
  { id: "pan", label: "Pan" },
  { id: "queer", label: "Queer" },
  { id: "hetero", label: "Hétero" },
  { id: "assexual", label: "Assexual" },
];

/** Community self-labels; never inferred from photos or other fields. */
export const TRIBES: Option<TribeId>[] = [
  { id: "bear", label: "Bear" },
  { id: "otter", label: "Otter" },
  { id: "twink", label: "Twink" },
  { id: "jock", label: "Jock" },
  { id: "geek", label: "Geek" },
  { id: "daddy", label: "Daddy" },
  { id: "leather", label: "Leather" },
  { id: "discreto", label: "Discreto" },
  { id: "trans", label: "Trans" },
  { id: "clean-cut", label: "Clean-cut" },
  { id: "rugged", label: "Rugged" },
  { id: "poz", label: "Poz" },
  { id: "sem-tribo", label: "Sem tribo" },
];

export const LOOKING_FOR: Option<LookingForId>[] = [
  { id: "amizade", label: "Amizade" },
  { id: "troca", label: "Troca de ideia" },
  { id: "namoro", label: "Namoro" },
  { id: "casual", label: "Casual" },
  { id: "agora", label: "Sexo / Agora" },
  { id: "networking", label: "Networking" },
];

export const POSITIONS: Option<PositionId>[] = [
  { id: "ativo", label: "Ativo" },
  { id: "vers-ativo", label: "Versátil ativo" },
  { id: "versatil", label: "Versátil" },
  { id: "vers-passivo", label: "Versátil passivo" },
  { id: "passivo", label: "Passivo" },
  { id: "side", label: "Side" },
];

export const SPORTS: Option<SportId>[] = [
  { id: "futebol", label: "Futebol" },
  { id: "volei", label: "Vôlei" },
  { id: "corrida", label: "Corrida" },
  { id: "musculacao", label: "Musculação" },
  { id: "natacao", label: "Natação" },
  { id: "yoga", label: "Yoga" },
  { id: "ciclismo", label: "Ciclismo" },
  { id: "crossfit", label: "Crossfit" },
  { id: "danca", label: "Dança" },
  { id: "trilha", label: "Trilha" },
  { id: "lutas", label: "Lutas" },
  { id: "skate", label: "Skate" },
];

export const BODY_TYPES: Option<BodyTypeId>[] = [
  { id: "definido", label: "Definido" },
  { id: "medio", label: "Médio" },
  { id: "grande", label: "Grande" },
  { id: "musculoso", label: "Musculoso" },
  { id: "esbelto", label: "Esbelto(a)" },
  { id: "robusto", label: "Robusto" },
];

const RELATIONSHIP_FORMS: Record<RelationshipId, Record<Pronouns, string>> = {
  solteiro: { ele: "Solteiro", ela: "Solteira", elu: "Solteire" },
  namorando: { ele: "Namorando", ela: "Namorando", elu: "Namorando" },
  casado: { ele: "Casado", ela: "Casada", elu: "Casade" },
  aberto: { ele: "Relacionamento aberto", ela: "Relacionamento aberto", elu: "Relacionamento aberto" },
};

export const RELATIONSHIPS: Option<RelationshipId>[] = [
  { id: "solteiro", label: "Solteiro(a/e)" },
  { id: "namorando", label: "Namorando" },
  { id: "casado", label: "Casado(a/e)" },
  { id: "aberto", label: "Relacionamento aberto" },
];

export function relationshipLabel(id: RelationshipId, pronouns: Pronouns): string {
  return RELATIONSHIP_FORMS[id][pronouns];
}

export const MEET_PLACES: Option<MeetPlaceId>[] = [
  { id: "minha-casa", label: "Minha casa" },
  { id: "sua-casa", label: "Sua casa" },
  { id: "bar", label: "Bar" },
  { id: "restaurante", label: "Restaurante" },
  { id: "cafe", label: "Café" },
  { id: "online", label: "Só online" },
];

export const CONDOM_USE: Option<CondomUse>[] = [
  { id: "sempre", label: "Sempre" },
  { id: "as-vezes", label: "Às vezes" },
  { id: "prefiro-nao-dizer", label: "Prefiro não dizer" },
];

export const HIV_STATUS: Record<HivStatus, string> = {
  negativo: "Negativo",
  "positivo-indetectavel": "Positivo, indetectável (I = I)",
  positivo: "Positivo",
  "prefiro-nao-dizer": "Prefiro não dizer",
};

export const TOPICS: Option<TopicId>[] = [
  { id: "cinema", label: "Cinema" },
  { id: "series", label: "Séries" },
  { id: "musica-eletronica", label: "Música eletrônica" },
  { id: "mpb", label: "MPB" },
  { id: "pop", label: "Pop" },
  { id: "kpop", label: "K-pop" },
  { id: "games", label: "Games" },
  { id: "anime", label: "Anime" },
  { id: "livros", label: "Livros" },
  { id: "politica", label: "Política" },
  { id: "tecnologia", label: "Tecnologia" },
  { id: "design", label: "Design" },
  { id: "moda", label: "Moda" },
  { id: "gastronomia", label: "Gastronomia" },
  { id: "viagens", label: "Viagens" },
  { id: "fotografia", label: "Fotografia" },
  { id: "arte", label: "Arte e museus" },
  { id: "teatro", label: "Teatro" },
  { id: "drag", label: "Drag" },
  { id: "astrologia", label: "Astrologia" },
  { id: "pets", label: "Pets" },
  { id: "plantas", label: "Plantas" },
  { id: "cafe", label: "Café" },
  { id: "cerveja", label: "Cerveja artesanal" },
  { id: "vinho", label: "Vinho" },
  { id: "natureza", label: "Natureza" },
  { id: "ativismo", label: "Ativismo LGBTQIA+" },
  { id: "saude-mental", label: "Saúde mental" },
  { id: "carreira", label: "Carreira" },
  { id: "idiomas", label: "Idiomas" },
  { id: "ciencia", label: "Ciência" },
  { id: "esportes", label: "Esportes" },
];

export const TOPIC_IDS = new Set<string>(TOPICS.map((t) => t.id));

export function labelOf<T extends string>(options: Option<T>[], id: T): string {
  return options.find((o) => o.id === id)?.label ?? id;
}

/** Simulated "today" so test recency and ages stay stable in the demo. */
export const DEMO_MONTH = "2026-11";

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function formatMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS[m - 1] ?? "?"}/${y}`;
}

export function formatDistance(meters: number): string {
  return meters < 1000 ? `${meters}m` : `${(meters / 1000).toFixed(1)}km`;
}
