/** OpenFreeMap vector style the radar starts from (no key, attribution required). */
export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/dark";

export const MAP_ATTRIBUTION = [
  { label: "OpenFreeMap", href: "https://openfreemap.org" },
  { label: "© OpenMapTiles", href: "https://www.openmaptiles.org/" },
  { label: "© OpenStreetMap", href: "https://www.openstreetmap.org/copyright" },
] as const;

interface StyleLayer {
  id: string;
  type: string;
  paint?: Record<string, unknown>;
  layout?: Record<string, unknown>;
}

export interface MapStyle {
  layers: StyleLayer[];
  [key: string]: unknown;
}

const BG = "#1b2530";

/** Muted slate palette that matches the app: the map is context, the people are the content. */
const PAINT: Record<string, Record<string, unknown>> = {
  background: { "background-color": BG },
  water: { "fill-color": "#1a3144" },
  waterway: { "line-color": "#1a3144" },
  landuse_residential: { "fill-color": "#1e2934" },
  landcover_wood: { "fill-color": "#1f3229" },
  landuse_park: { "fill-color": "#21362a" },
  building: { "fill-color": "#222d38" },
  "aeroway-area": { "fill-color": "#222d38" },
  "aeroway-taxiway": { "line-color": "#283340" },
  "aeroway-runway-casing": { "line-color": "#34414f" },
  "aeroway-runway": { "line-color": "#2d3946" },
  highway_path: { "line-color": "#283340" },
  highway_minor: { "line-color": "#2d3946" },
  highway_major_casing: { "line-color": "#3b4858" },
  highway_major_inner: { "line-color": "#34414f" },
  highway_major_subtle: { "line-color": "#36424f" },
  highway_motorway_casing: { "line-color": "#46546a" },
  highway_motorway_inner: { "line-color": "#3d4b5e" },
  highway_motorway_subtle: { "line-color": "#36424f" },
};

const HIDDEN = new Set(["road_oneway", "road_oneway_opposite"]);

/** Recolors the dark OpenFreeMap style in place of the original and hides arrows that only add noise. */
export function tintMapStyle<T extends MapStyle>(style: T): T {
  const layers = style.layers.map((layer) => {
    if (HIDDEN.has(layer.id)) return { ...layer, layout: { ...layer.layout, visibility: "none" } };
    const paint = PAINT[layer.id];
    if (paint) {
      // The style's sprite has no "wood-pattern"; a plain tint avoids a missing-image warning per tile.
      const rest = { ...layer.paint };
      delete rest["fill-pattern"];
      return { ...layer, paint: { ...rest, ...paint } };
    }
    if (layer.type === "symbol") {
      return {
        ...layer,
        paint: {
          ...layer.paint,
          "text-color": layer.id.startsWith("place_") ? "#a3b1bf" : "#7f8e9e",
          "text-halo-color": "rgba(27, 37, 48, 0.9)",
          "text-halo-width": 1.2,
        },
      };
    }
    return layer;
  });
  return { ...style, layers };
}
