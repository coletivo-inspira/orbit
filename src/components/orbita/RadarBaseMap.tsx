"use client";

import { useEffect, useRef, type RefObject } from "react";
import { fromMercator, type MercatorPoint } from "@/lib/geo/mercator";
import { MAP_STYLE_URL, tintMapStyle, type MapStyle } from "@/lib/geo/mapStyle";

export type BaseMapStatus = "carregando" | "pronto" | "falhou";

export interface BaseMapController {
  sync: (center: MercatorPoint, zoom: number) => void;
}

interface RadarBaseMapProps {
  controllerRef: RefObject<BaseMapController | null>;
  onStatus: (status: BaseMapStatus) => void;
  /** Camera to start from, read once when the map is created. */
  initialCamera: () => { center: MercatorPoint; zoom: number } | null;
  ready: boolean;
}

type MapInstance = import("maplibre-gl").Map;

const MAX_PIXEL_RATIO = 1.5;

/**
 * Real street map (OpenFreeMap vector tiles drawn by MapLibre GL) under the radar. The library is
 * loaded only when the radar opens; the map never handles input, it just follows the radar's camera.
 */
export function RadarBaseMap({ controllerRef, onStatus, initialCamera, ready }: RadarBaseMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onStatusRef = useRef(onStatus);
  const initialRef = useRef(initialCamera);

  useEffect(() => {
    onStatusRef.current = onStatus;
    initialRef.current = initialCamera;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let map: MapInstance | null = null;
    let cancelled = false;
    const latest: { camera: { center: MercatorPoint; zoom: number } | null } = { camera: null };

    const apply = (center: MercatorPoint, zoom: number) => {
      latest.camera = { center, zoom };
      if (!map) return;
      const { lng, lat } = fromMercator(center);
      map.jumpTo({ center: [lng, lat], zoom });
      // Draw now, in the same frame as the bubbles, instead of one frame behind them.
      if (map.isStyleLoaded()) map.redraw();
    };
    controllerRef.current = { sync: apply };

    const fail = () => {
      if (!cancelled) onStatusRef.current("falhou");
    };

    (async () => {
      try {
        const [maplibre, style] = await Promise.all([
          import("maplibre-gl"),
          fetch(MAP_STYLE_URL).then((r) => (r.ok ? (r.json() as Promise<MapStyle>) : Promise.reject(r.status))),
        ]);
        if (cancelled) return;
        const start = latest.camera ?? initialRef.current();
        const center = start ? fromMercator(start.center) : { lng: 0, lat: 0 };
        map = new maplibre.Map({
          container,
          style: tintMapStyle(style) as unknown as import("maplibre-gl").StyleSpecification,
          center: [center.lng, center.lat],
          zoom: start?.zoom ?? 13,
          interactive: false,
          attributionControl: false,
          renderWorldCopies: false,
          // The map is a dimmed backdrop: capping its resolution saves most of the fill cost on dense
          // screens, while the bubbles (DOM) stay sharp.
          pixelRatio: Math.min(MAX_PIXEL_RATIO, window.devicePixelRatio || 1),
          fadeDuration: 150,
        });
        map.once("load", () => !cancelled && onStatusRef.current("pronto"));
        map.on("error", (e) => {
          if (map && !map.loaded() && !map.isStyleLoaded()) fail();
          else console.warn("Mapa:", e.error?.message);
        });
        if (latest.camera) apply(latest.camera.center, latest.camera.zoom);
      } catch {
        fail();
      }
    })();

    return () => {
      cancelled = true;
      controllerRef.current = null;
      map?.remove();
      map = null;
    };
  }, [controllerRef]);

  return (
    <div
      ref={containerRef}
      className={`orbit-map pointer-events-none absolute inset-0 transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`}
      aria-hidden="true"
    />
  );
}
