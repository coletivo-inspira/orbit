/** Web Mercator helpers matching MapLibre's camera: 512 px tiles, north up, no pitch. */

export const TILE_SIZE = 512;
const EARTH_RADIUS_M = 6_371_008.8;
const EARTH_CIRCUMFERENCE_M = 40_075_016.686;
const MAX_LAT = 85.051129;

export interface LngLat {
  lng: number;
  lat: number;
}

/** Point in normalized Mercator space: (0, 0) is the north-west corner of the world, (1, 1) the south-east. */
export interface MercatorPoint {
  x: number;
  y: number;
}

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

export function worldSize(zoom: number): number {
  return TILE_SIZE * Math.pow(2, zoom);
}

export function toMercator({ lng, lat }: LngLat): MercatorPoint {
  const clamped = Math.max(-MAX_LAT, Math.min(MAX_LAT, lat));
  const sin = Math.sin(toRad(clamped));
  return {
    x: (lng + 180) / 360,
    y: 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI),
  };
}

export function fromMercator({ x, y }: MercatorPoint): LngLat {
  const n = Math.PI - 2 * Math.PI * y;
  return { lng: x * 360 - 180, lat: toDeg(Math.atan(Math.sinh(n))) };
}

export function metersPerPixel(lat: number, zoom: number): number {
  return (EARTH_CIRCUMFERENCE_M * Math.cos(toRad(lat))) / worldSize(zoom);
}

/** Length of `meters` in normalized Mercator units, around latitude `lat`. */
export function metersToMercator(meters: number, lat: number): number {
  return meters / (EARTH_CIRCUMFERENCE_M * Math.cos(toRad(lat)));
}

/** Zoom at which `distanceM` spans `pixels` on screen at latitude `lat`. */
export function zoomForDistance(distanceM: number, pixels: number, lat: number): number {
  return Math.log2((EARTH_CIRCUMFERENCE_M * Math.cos(toRad(lat)) * pixels) / (TILE_SIZE * Math.max(1, distanceM)));
}

/** Point reached by walking `distanceM` from `from` along the initial `bearingDeg` (0 = north, clockwise). */
export function destination(from: LngLat, bearingDeg: number, distanceM: number): LngLat {
  const delta = distanceM / EARTH_RADIUS_M;
  const theta = toRad(bearingDeg);
  const phi1 = toRad(from.lat);
  const lambda1 = toRad(from.lng);
  const sinPhi2 = Math.sin(phi1) * Math.cos(delta) + Math.cos(phi1) * Math.sin(delta) * Math.cos(theta);
  const phi2 = Math.asin(sinPhi2);
  const lambda2 =
    lambda1 +
    Math.atan2(Math.sin(theta) * Math.sin(delta) * Math.cos(phi1), Math.cos(delta) - Math.sin(phi1) * sinPhi2);
  return { lat: toDeg(phi2), lng: ((toDeg(lambda2) + 540) % 360) - 180 };
}

export function haversine(a: LngLat, b: LngLat): number {
  const dPhi = toRad(b.lat - a.lat);
  const dLambda = toRad(b.lng - a.lng);
  const h = Math.sin(dPhi / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLambda / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing from `a` to `b`, in degrees [0, 360). */
export function bearing(a: LngLat, b: LngLat): number {
  const phi1 = toRad(a.lat);
  const phi2 = toRad(b.lat);
  const dLambda = toRad(b.lng - a.lng);
  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}
