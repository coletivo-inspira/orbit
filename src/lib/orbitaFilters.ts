import { DEMO_MONTH } from "@/lib/data/profileOptions";
import type {
  CondomUse,
  GenderId,
  IntentionId,
  LookingForId,
  MeetPlaceId,
  OrientationId,
  PositionId,
  Profile,
  RelationshipId,
  SportId,
  TopicId,
  TribeId,
} from "@/lib/types";

export interface NumberRange {
  min: number | null;
  max: number | null;
}

export interface OrbitaFilters {
  genders: GenderId[];
  orientations: OrientationId[];
  tribes: TribeId[];
  lookingFor: LookingForId[];
  positions: PositionId[];
  sports: SportId[];
  relationships: RelationshipId[];
  meetAt: MeetPlaceId[];
  condom: CondomUse[];
  topics: TopicId[];
  age: NumberRange;
  height: NumberRange;
  weight: NumberRange;
  nsfw: "any" | "sim" | "nao";
  prepOnly: boolean;
  /** Last test within this many months of the demo date. */
  testedWithinMonths: number | null;
  onlineOnly: boolean;
}

export type OrbitaSort = "proximidade" | "afinidade";

export type ListFilterKey = {
  [K in keyof OrbitaFilters]: OrbitaFilters[K] extends string[] ? K : never;
}[keyof OrbitaFilters];

export type RangeFilterKey = "age" | "height" | "weight";

export const RANGE_LIMITS: Record<RangeFilterKey, { min: number; max: number; step: number; unit: string }> = {
  age: { min: 18, max: 60, step: 1, unit: "anos" },
  height: { min: 150, max: 200, step: 1, unit: "cm" },
  weight: { min: 45, max: 130, step: 1, unit: "kg" },
};

export const EMPTY_FILTERS: OrbitaFilters = {
  genders: [],
  orientations: [],
  tribes: [],
  lookingFor: [],
  positions: [],
  sports: [],
  relationships: [],
  meetAt: [],
  condom: [],
  topics: [],
  age: { min: null, max: null },
  height: { min: null, max: null },
  weight: { min: null, max: null },
  nsfw: "any",
  prepOnly: false,
  testedWithinMonths: null,
  onlineOnly: false,
};

const LIST_KEYS: ListFilterKey[] = [
  "genders",
  "orientations",
  "tribes",
  "lookingFor",
  "positions",
  "sports",
  "relationships",
  "meetAt",
  "condom",
  "topics",
];

export function toggleInList<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/** Months from `from` to `to`, both "YYYY-MM". */
export function monthsBetween(from: string, to: string): number {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

function anyOf<T>(selected: readonly T[], values: readonly T[]): boolean {
  return selected.length === 0 || values.some((v) => selected.includes(v));
}

function inRange(range: NumberRange, value: number | undefined): boolean {
  if (range.min === null && range.max === null) return true;
  if (value === undefined) return false;
  return (range.min === null || value >= range.min) && (range.max === null || value <= range.max);
}

/**
 * OR inside a group, AND across groups. Optional fields left blank only fail
 * a group that is actively filtering on them.
 */
export function matchesFilters(p: Profile, f: OrbitaFilters, today: string = DEMO_MONTH): boolean {
  if (f.onlineOnly && !p.online) return false;
  if (!anyOf(f.genders, [p.gender])) return false;
  if (!anyOf(f.orientations, [p.orientation])) return false;
  if (!anyOf(f.tribes, p.tribes.length ? p.tribes : ["sem-tribo"])) return false;
  if (!anyOf(f.lookingFor, p.lookingFor)) return false;
  if (!anyOf(f.positions, p.position ? [p.position] : [])) return false;
  if (!anyOf(f.sports, p.sports)) return false;
  if (!anyOf(f.relationships, p.relationship ? [p.relationship] : [])) return false;
  if (!anyOf(f.meetAt, p.meetAt)) return false;
  if (!anyOf(f.condom, p.health.condom ? [p.health.condom] : [])) return false;
  if (!anyOf(f.topics, p.topics)) return false;
  if (!inRange(f.age, p.age) || !inRange(f.height, p.heightCm) || !inRange(f.weight, p.weightKg)) return false;
  if (f.nsfw === "sim" && p.acceptsNsfw !== true) return false;
  if (f.nsfw === "nao" && p.acceptsNsfw !== false) return false;
  if (f.prepOnly && p.health.prep !== true) return false;
  if (f.testedWithinMonths !== null) {
    if (!p.health.lastTest) return false;
    const age = monthsBetween(p.health.lastTest, today);
    if (age < 0 || age > f.testedWithinMonths) return false;
  }
  return true;
}

export function activeFilterCount(f: OrbitaFilters): number {
  let count = LIST_KEYS.reduce((n, key) => n + (f[key].length ? 1 : 0), 0);
  for (const key of ["age", "height", "weight"] as const) {
    if (f[key].min !== null || f[key].max !== null) count++;
  }
  if (f.nsfw !== "any") count++;
  if (f.prepOnly) count++;
  if (f.testedWithinMonths !== null) count++;
  if (f.onlineOnly) count++;
  return count;
}

export function sharedTopics(mine: readonly TopicId[], theirs: readonly TopicId[]): TopicId[] {
  return theirs.filter((t) => mine.includes(t));
}

export interface OrbitaQuery {
  intention: "all" | IntentionId;
  filters: OrbitaFilters;
  sort: OrbitaSort;
  userTopics: readonly TopicId[];
  today?: string;
}

/** Profiles for the radar and list; the first ones sit on the inner rings. */
export function selectOrbitaProfiles(profiles: readonly Profile[], q: OrbitaQuery): Profile[] {
  const visible = profiles.filter(
    (p) => (q.intention === "all" || p.intentions.includes(q.intention)) && matchesFilters(p, q.filters, q.today),
  );
  if (q.sort === "afinidade") {
    const score = new Map(visible.map((p) => [p.id, sharedTopics(q.userTopics, p.topics).length]));
    return visible.sort((a, b) => score.get(b.id)! - score.get(a.id)! || a.distanceM - b.distanceM);
  }
  return visible.sort((a, b) => a.distanceM - b.distanceM);
}
