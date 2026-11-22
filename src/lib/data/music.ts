import type { Profile, UserProfile } from "@/lib/types";

export type MusicGenreId = "pop" | "indie" | "eletronica" | "mpb" | "funk" | "rock" | "lofi" | "rap" | "jazz" | "kpop";

export const MUSIC_GENRES: Record<MusicGenreId, string> = {
  pop: "Pop",
  indie: "Indie",
  eletronica: "Eletrônica",
  mpb: "MPB",
  funk: "Funk",
  rock: "Rock",
  lofi: "Lo-fi",
  rap: "Rap",
  jazz: "Jazz",
  kpop: "K-pop",
};

/**
 * Simulated "top genres" for demo profiles that linked Spotify. The real integration
 * reads the user's top artists (scope `user-top-read`) server-side and keeps only genres.
 */
const SPOTIFY_TOP_GENRES: Record<string, MusicGenreId[]> = {
  p1: ["indie", "lofi", "pop"],
  p3: ["indie", "rock", "mpb"],
  p5: ["eletronica", "funk", "pop"],
  p10: ["lofi", "eletronica", "rock"],
  p14: ["lofi", "kpop", "indie"],
  p16: ["mpb", "jazz"],
  p19: ["pop", "mpb", "funk"],
  p22: ["jazz", "mpb", "indie"],
  p46: ["eletronica", "pop", "rap"],
  p47: ["indie", "pop", "kpop"],
};

const DEMO_USER_GENRES: MusicGenreId[] = ["indie", "eletronica", "mpb"];

const GENRE_IDS = Object.keys(MUSIC_GENRES) as MusicGenreId[];

/** Stable pseudo-random pick of two genres for generated profiles, from their id. */
function derivedGenres(id: string): MusicGenreId[] {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  const a = (h >>> 0) % GENRE_IDS.length;
  const b = (a + 1 + ((h >>> 8) % (GENRE_IDS.length - 1))) % GENRE_IDS.length;
  return [GENRE_IDS[a], GENRE_IDS[b]];
}

/** Only people with an active Spotify badge expose music taste. */
export function profileGenres(profile: Profile): MusicGenreId[] {
  if (!profile.apps.spotify?.active) return [];
  return SPOTIFY_TOP_GENRES[profile.id] ?? derivedGenres(profile.id);
}

export function userGenres(user: UserProfile): MusicGenreId[] {
  return user.apps.spotify.active ? DEMO_USER_GENRES : [];
}
