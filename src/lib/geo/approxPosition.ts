import { destination, type LngLat } from "@/lib/geo/mercator";

/** Default "Você" when the user has not shared a location: Savassi, Belo Horizonte, where the demo profiles live. */
export const DEFAULT_LOCATION: LngLat = { lat: -19.9386, lng: -43.9347 };

/** Decimals kept from a real device position (3 ≈ 110 m): enough for the map, not an address. */
export const LOCATION_DECIMALS = 3;

/** Distance noise: at least this many meters, so no simulated position matches the shown distance exactly. */
export const MIN_DISTANCE_JITTER_M = 25;
/** Distance noise as a share of the distance: between 4% and 12%, in or out. */
export const DISTANCE_JITTER_MIN = 0.04;
export const DISTANCE_JITTER_MAX = 0.12;
/** Bearing noise added to the hashed bearing, in degrees either way. */
export const BEARING_JITTER_DEG = 12;
/** Never place anyone closer than this to "Você", whatever the jitter. */
const MIN_PLACED_DISTANCE_M = 60;

export function roundLocation({ lat, lng }: LngLat, decimals = LOCATION_DECIMALS): LngLat {
  const f = Math.pow(10, decimals);
  return { lat: Math.round(lat * f) / f, lng: Math.round(lng * f) / f };
}

/** FNV-1a: a stable 32-bit hash of the id, so a profile keeps its spot between visits. */
export function hashId(id: string, salt: string): number {
  let h = 0x811c9dc5;
  const s = `${salt}:${id}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return h >>> 0;
}

const unit = (id: string, salt: string) => hashId(id, salt) / 4294967296;

export interface ApproxPlacement {
  /** Degrees clockwise from north. */
  bearingDeg: number;
  /** Where the bubble sits, never exactly the distance shown on it. */
  placedM: number;
}

/**
 * Approximate, privacy-preserving placement of a simulated profile: the direction comes from a hash
 * of the id (plus noise) and the distance is the profile's own distance with noise, so the map
 * reads "about 500 m that way" without ever being an exact position.
 */
export function approximatePlacement(id: string, distanceM: number): ApproxPlacement {
  const bearingDeg = (unit(id, "rumo") * 360 + (unit(id, "rumo-ruido") * 2 - 1) * BEARING_JITTER_DEG + 360) % 360;
  const share = DISTANCE_JITTER_MIN + unit(id, "distancia") * (DISTANCE_JITTER_MAX - DISTANCE_JITTER_MIN);
  const sign = unit(id, "sentido") < 0.5 ? -1 : 1;
  const jitter = Math.max(MIN_DISTANCE_JITTER_M, distanceM * share);
  let placedM = distanceM + sign * jitter;
  if (placedM < MIN_PLACED_DISTANCE_M) placedM = distanceM + jitter;
  return { bearingDeg, placedM };
}

export function approximateLocation(origin: LngLat, id: string, distanceM: number): LngLat {
  const { bearingDeg, placedM } = approximatePlacement(id, distanceM);
  return destination(origin, bearingDeg, placedM);
}
