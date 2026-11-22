/**
 * Rasterizes Natural Earth 1:110m land (public domain) into the dotted
 * world map of the Parque: node scripts/build-world-map.mts
 */
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const SOURCE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson";
const OUT = fileURLToPath(new URL("../src/lib/data/worldLand.json", import.meta.url));
const STEP = 2.5;
const LAT_TOP = 80;
const LAT_BOTTOM = -57.5;

type Ring = [number, number][];
interface Feature {
  geometry: { type: "Polygon"; coordinates: Ring[] } | { type: "MultiPolygon"; coordinates: Ring[][] };
}

function inRing([x, y]: [number, number], ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const geo = (await (await fetch(SOURCE)).json()) as { features: Feature[] };
const polygons: Ring[][] = geo.features.flatMap((f) =>
  f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates,
);

const rows: string[] = [];
for (let lat = LAT_TOP; lat >= LAT_BOTTOM; lat -= STEP) {
  let row = "";
  for (let lon = -180 + STEP / 2; lon < 180; lon += STEP) {
    const p: [number, number] = [lon, lat];
    row += polygons.some((poly) => inRing(p, poly[0]) && !poly.slice(1).some((hole) => inRing(p, hole))) ? "#" : ".";
  }
  rows.push(row);
}

await writeFile(OUT, JSON.stringify({ step: STEP, latTop: LAT_TOP, lonLeft: -180 + STEP / 2, rows }, null, 1) + "\n");
console.log(`${rows.length} linhas × ${rows[0].length} colunas → ${OUT}`);
