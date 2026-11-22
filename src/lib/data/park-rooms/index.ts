import type { RoomMapData } from "@/lib/world/osmRoom";

type Loader = () => Promise<{ default: unknown }>;

/** Each city room is its own chunk, fetched only when someone walks in. */
const LOADERS: Record<string, Loader> = {
  "paris-torre-eiffel": () => import("./paris-torre-eiffel.json"),
  "rio-pao-de-acucar": () => import("./rio-pao-de-acucar.json"),
  "sp-masp-paulista": () => import("./sp-masp-paulista.json"),
  "nyc-stonewall": () => import("./nyc-stonewall.json"),
  "sf-castro": () => import("./sf-castro.json"),
  "tokyo-nichome": () => import("./tokyo-nichome.json"),
};

export function hasRoomMap(id: string): boolean {
  return Object.hasOwn(LOADERS, id);
}

export async function loadRoomMap(id: string): Promise<RoomMapData> {
  const loader = LOADERS[id];
  if (!loader) throw new Error(`Sala sem mapa: ${id}`);
  return (await loader()).default as RoomMapData;
}
