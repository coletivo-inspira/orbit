import { SIMULATED_PROFILES } from "@/lib/data/profiles";
import type { Profile } from "@/lib/types";

export type InteresseTab = "visualizacoes" | "toques";

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
