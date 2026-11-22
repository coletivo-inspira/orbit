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

/** Only people with an active Spotify badge expose music taste. */
export function profileGenres(profile: Profile): MusicGenreId[] {
  return profile.apps.spotify?.active ? (SPOTIFY_TOP_GENRES[profile.id] ?? []) : [];
}

export function userGenres(user: UserProfile): MusicGenreId[] {
  return user.apps.spotify.active ? DEMO_USER_GENRES : [];
}
