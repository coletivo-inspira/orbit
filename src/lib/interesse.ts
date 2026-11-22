import { SIMULATED_PROFILES } from "@/lib/data/profiles";
import type { Profile } from "@/lib/types";

export interface InterestEvent {
  profile: Profile;
  minutesAgo: number;
}

/**
 * Deterministic picks from the demo roster: `step` must be coprime with the roster size so nobody repeats.
 * Times grow quadratically, from minutes to a few days ago.
 */
function simulate(count: number, step: number, offset: number, firstMinutes: number): InterestEvent[] {
  const n = SIMULATED_PROFILES.length;
  return Array.from({ length: Math.min(count, n) }, (_, k) => ({
    profile: SIMULATED_PROFILES[(offset + k * step) % n],
    minutesAgo: firstMinutes + k * 20 + k * k * 6,
  }));
}

/** Who viewed the user's profile (simulated, no backend). */
export const PROFILE_VIEWS: InterestEvent[] = simulate(31, 13, 0, 16);

/** Who tapped the user (simulated, no backend). */
export const RECEIVED_TAPS: InterestEvent[] = simulate(15, 29, 5, 16);

/** How many times each viewer opened the profile (simulated); most people looked once. */
const OPENS_PATTERN = [1, 3, 1, 2, 1, 1, 4, 1, 2];

/** One person in the Interesse pile: their latest activity, profile opens and toque, if any. */
export interface InterestEntry {
  profile: Profile;
  /** Most recent activity, view or toque. */
  minutesAgo: number;
  /** Times they opened the user's profile; 0 when they only tapped. */
  opens: number;
  tapMinutesAgo?: number;
}

/** Views and toques merged per person, most recent first. */
export function buildInterestFeed(
  views: readonly InterestEvent[],
  taps: readonly InterestEvent[],
  opensFor: (viewIndex: number) => number = (k) => OPENS_PATTERN[k % OPENS_PATTERN.length],
): InterestEntry[] {
  const byId = new Map<string, InterestEntry>();
  const entry = (profile: Profile, minutesAgo: number) => {
    const current = byId.get(profile.id) ?? { profile, minutesAgo, opens: 0 };
    current.minutesAgo = Math.min(current.minutesAgo, minutesAgo);
    byId.set(profile.id, current);
    return current;
  };
  views.forEach((v, k) => (entry(v.profile, v.minutesAgo).opens += opensFor(k)));
  for (const t of taps) {
    const e = entry(t.profile, t.minutesAgo);
    e.tapMinutesAgo = Math.min(e.tapMinutesAgo ?? Infinity, t.minutesAgo);
  }
  return [...byId.values()].sort((a, b) => a.minutesAgo - b.minutesAgo || a.profile.id.localeCompare(b.profile.id));
}

export const INTEREST_FEED: InterestEntry[] = buildInterestFeed(PROFILE_VIEWS, RECEIVED_TAPS);

const TAP_BY_PROFILE = new Map(RECEIVED_TAPS.map((e) => [e.profile.id, e]));

export function receivedTapFrom(profileId: string): InterestEvent | undefined {
  return TAP_BY_PROFILE.get(profileId);
}

export function formatAgo(minutes: number): string {
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${Math.round(minutes)} min`;
  if (minutes < 60 * 24) return `há ${Math.floor(minutes / 60)} h`;
  const days = Math.floor(minutes / (60 * 24));
  return days === 1 ? "há 1 dia" : `há ${days} dias`;
}
