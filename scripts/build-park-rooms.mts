/**
 * Regenerates the clay city rooms of the Parque from OpenStreetMap.
 *
 *   node scripts/build-park-rooms.mts            # every room
 *   node scripts/build-park-rooms.mts rio-pao-de-acucar
 *
 * Queries the public Overpass API (OSM data, ODbL — keep the attribution in the
 * app) and writes one JSON per room to src/lib/data/park-rooms/.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { CITY_ROOMS } from "../src/lib/data/parkRooms.ts";
import { buildRoomMap, type OsmElement } from "../src/lib/world/osmRoom.ts";

const OUT_DIR = fileURLToPath(new URL("../src/lib/data/park-rooms/", import.meta.url));
const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];
const MARGIN_M = 40;

function bbox(lat: number, lon: number, halfM: number): string {
  const dLat = halfM / 111_320;
  const dLon = halfM / (111_320 * Math.cos((lat * Math.PI) / 180));
  return [lat - dLat, lon - dLon, lat + dLat, lon + dLon].map((v) => v.toFixed(6)).join(",");
}

function query(box: string): string {
  return `[out:json][timeout:120][bbox:${box}];
(
  way[building]; relation[building][type=multipolygon];
  way[highway];
  way[landuse]; relation[landuse][type=multipolygon];
  way[leisure]; relation[leisure][type=multipolygon];
  way[natural]; relation[natural][type=multipolygon];
  way[amenity~"^(parking|fountain)$"]; way[place=square]; way["area:highway"]; way[waterway=riverbank];
  way[aerialway~"^(cable_car|gondola)$"];
  node[natural=tree];
  node[name][amenity]; node[name][tourism]; node[name][shop];
);
out geom;`;
}

async function fetchOverpass(q: string): Promise<OsmElement[]> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 6; attempt++) {
    const endpoint = ENDPOINTS[attempt % ENDPOINTS.length];
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "orbit-park-rooms/1.0 (https://github.com/coletivo-inspira/orbit)",
        },
        body: new URLSearchParams({ data: q }),
      });
      if (!res.ok) throw new Error(`${endpoint} → HTTP ${res.status}`);
      const json = (await res.json()) as { elements: OsmElement[] };
      return json.elements;
    } catch (err) {
      lastError = err;
      console.warn(`  tentativa ${attempt + 1} falhou: ${(err as Error).message}`);
      await new Promise((r) => setTimeout(r, 4000 * 2 ** Math.min(attempt, 3)));
    }
  }
  throw lastError;
}

const only = process.argv.slice(2);
const rooms = only.length ? CITY_ROOMS.filter((r) => only.includes(r.id)) : CITY_ROOMS;
await mkdir(OUT_DIR, { recursive: true });

for (const room of rooms) {
  console.log(`▶ ${room.id}`);
  const elements = await fetchOverpass(query(bbox(room.center.lat, room.center.lon, room.radiusM + MARGIN_M)));
  const map = buildRoomMap(elements, {
    id: room.id,
    center: room.center,
    radiusM: room.radiusM,
    landmarkOsmId: room.landmark.osmId,
  });
  await writeFile(`${OUT_DIR}${room.id}.json`, JSON.stringify(map) + "\n");
  console.log(
    `  ${elements.length} elementos OSM → ${map.buildings.length} prédios, ${map.roads.length} vias, ` +
      `${map.areas.length} áreas, ${map.trees.length / 2} árvores, ${map.pois.length} pontos`,
  );
}
