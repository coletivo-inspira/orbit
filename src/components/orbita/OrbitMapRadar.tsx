"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { MolduraDoUsuario } from "@/components/molduras/MolduraAvatar";
import { ConversationBalloon } from "@/components/orbita/ConversationBalloon";
import { RadarBaseMap, type BaseMapController, type BaseMapStatus } from "@/components/orbita/RadarBaseMap";
import { RadarLocationControl } from "@/components/orbita/RadarLocationControl";
import { RadarMapBackdrop } from "@/components/orbita/RadarMapBackdrop";
import { RecenterContext } from "@/components/orbita/recenter";
import { SelosStatus } from "@/components/orbita/SelosStatus";
import { Avatar, ProfileImage } from "@/components/ui/Avatar";
import { OrbeVidro } from "@/components/ui/OrbeVidro";
import { hasTalked } from "@/lib/conversas";
import { INTENTIONS } from "@/lib/data/intentions";
import { formatDistance } from "@/lib/data/profileOptions";
import { prefersReducedMotion } from "@/lib/a11y/motion";
import {
  bubbleScale,
  clusterTarget,
  itemsInView,
  layoutMap,
  scaleBox,
  type LayoutItem,
  type MapLayout,
  type MarkerBox,
} from "@/lib/engines/mapLayout";
import { OrbitMapEngine, type MapView } from "@/lib/engines/orbitMap";
import { RADAR_TILE } from "@/lib/engines/radarMap";
import { approximateLocation } from "@/lib/geo/approxPosition";
import { MAP_ATTRIBUTION } from "@/lib/geo/mapStyle";
import { metersToMercator, toMercator, worldSize, zoomForDistance, type MercatorPoint } from "@/lib/geo/mercator";
import { useUserLocation } from "@/lib/geo/userLocation";
import { useDevice } from "@/lib/state/device";
import { useOrbit } from "@/lib/state/OrbitProvider";
import type { Profile } from "@/lib/types";

interface OrbitMapRadarProps {
  profiles: Profile[];
  centerOffsetY?: number;
  compact?: boolean;
  onCenterClick: () => void;
  /** Shared-topic count per profile id, shown as a badge on each bubble. */
  affinity?: ReadonlyMap<string, number>;
  /** Rendered inside the field (e.g. the recenter button, which reads `useOrbitRecenter`). */
  overlay?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const MIN_ZOOM = 9.5;
const MAX_ZOOM = 17;
/** From this zoom on every bubble shows its conversation balloon, not only those touching "Você". */
const BALLOON_ZOOM = 14.5;
const RADIUS = 32;
const DIAMETER = RADIUS * 2;
const CENTER_SIZE = Math.round(RADIUS * 2.15);
/** Avatar centered on the position, name pill below it (the label is what makes markers tall). */
const BUBBLE_BOX: MarkerBox = { halfW: 44, top: RADIUS + 5, bottom: RADIUS + 30 };
const YOU_BOX: MarkerBox = { halfW: 50, top: 50, bottom: 56 };
const RINGS_M = [500, 1000, 2000, 5000, 10000, 20000];
/** The home zoom frames this many of the nearest people (fewer on a phone, where faces need room). */
const HOME_FRAMES = 24;
const HOME_FRAMES_COMPACT = 14;

/** Layouts per zoom step for one set of positions, computed on first use. */
const layoutCache = new WeakMap<readonly MercatorPoint[], Map<number, MapLayout>>();

function layoutFor(points: readonly MercatorPoint[], origin: MercatorPoint, zoom: number): MapLayout {
  let byZoom = layoutCache.get(points);
  if (!byZoom) {
    byZoom = new Map();
    layoutCache.set(points, byZoom);
  }
  let layout = byZoom.get(zoom);
  if (!layout) {
    const box = scaleBox(BUBBLE_BOX, bubbleScale(zoom));
    layout = layoutMap(points, {
      zoom,
      box,
      maxNudge: box.top + box.bottom,
      avoid: { point: origin, box: YOU_BOX },
      gap: clusterGap(zoom),
    });
    byZoom.set(zoom, layout);
  }
  return layout;
}

/** Zoomed out, markers keep more room between them: fewer, bigger clusters and more of the city visible. */
export function clusterGap(zoom: number): number {
  return zoom < 12.5 ? 4 + (12.5 - zoom) * 26 : 4;
}

const markerKey = (item: LayoutItem, profiles: Profile[]) =>
  `${item.members.length > 1 ? "g" : "p"}:${profiles[item.members[0]].id}`;

const ringLabel = (m: number) => (m >= 1000 ? `${m / 1000} km` : `${m} m`);

/**
 * Órbita radar on a real map: "Você" at the user's (or the default) location and everyone else at an
 * approximate spot matching their distance. Bubbles are DOM, laid out per zoom step (nudged or
 * clustered so they never overlap) and culled to the view; the map is a lazily loaded backdrop.
 */
export function OrbitMapRadar({
  profiles,
  centerOffsetY = 0,
  compact = false,
  onCenterClick,
  affinity,
  overlay,
  className = "",
  style,
}: OrbitMapRadarProps) {
  const { state, dispatch } = useOrbit();
  const { getScale } = useDevice();
  const { location } = useUserLocation();
  const fieldRef = useRef<HTMLDivElement>(null);
  const youRef = useRef<HTMLButtonElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const ringsRef = useRef<SVGGElement>(null);
  const markerRefs = useRef(new Map<string, HTMLDivElement>());
  const engineRef = useRef<OrbitMapEngine | null>(null);
  const baseMapRef = useRef<BaseMapController | null>(null);
  const [mapStatus, setMapStatus] = useState<BaseMapStatus>("carregando");
  const [view, setView] = useState<MapView | null>(null);

  const origin = useMemo(() => toMercator(location), [location]);
  const points = useMemo(
    () => profiles.map((p) => toMercator(approximateLocation(location, p.id, p.distanceM))),
    [profiles, location],
  );
  const farthestM = useMemo(() => profiles.reduce((m, p) => Math.max(m, p.distanceM), 0), [profiles]);
  const maxDistance = metersToMercator(Math.max(3000, farthestM * 1.15), location.lat);
  const homeDistanceM = useMemo(() => {
    const sorted = profiles.map((p) => p.distanceM).sort((a, b) => a - b);
    return (sorted[Math.min(sorted.length, compact ? HOME_FRAMES_COMPACT : HOME_FRAMES) - 1] ?? 1000) * 1.1;
  }, [profiles, compact]);

  const homeZoom = useCallback(
    (w: number, h: number) => {
      const radius = Math.max(120, Math.min(w / 2, h / 2 - Math.abs(centerOffsetY)) * 0.82);
      return Math.max(11, Math.min(15.5, zoomForDistance(homeDistanceM, radius, location.lat)));
    },
    [homeDistanceM, centerOffsetY, location.lat],
  );
  const homeZoomRef = useRef(homeZoom);

  const layout = view ? layoutFor(points, origin, view.zoom) : null;
  const visible = layout && view ? itemsInView(layout.items, view.x, view.y, view.halfW, view.halfH) : [];
  const layoutSize = layout ? worldSize(layout.zoom) : 1;
  const scale = layout ? bubbleScale(layout.zoom) : 1;
  const nodeSpecs = layout
    ? visible.map((i) => {
        const item = layout.items[i];
        return {
          key: markerKey(item, profiles),
          point: { x: item.x / layoutSize, y: item.y / layoutSize },
          index: i,
        };
      })
    : [];

  useEffect(() => {
    homeZoomRef.current = homeZoom;
  }, [homeZoom]);

  const originRef = useRef({ origin, maxDistance });
  useEffect(() => {
    originRef.current = { origin, maxDistance };
    engineRef.current?.setOrigin(origin, maxDistance);
  }, [origin, maxDistance]);

  useEffect(() => {
    const field = fieldRef.current;
    const you = youRef.current;
    if (!field || !you) return;
    const engine = new OrbitMapEngine({
      container: field,
      youEl: you,
      origin: originRef.current.origin,
      maxDistance: originRef.current.maxDistance,
      homeZoom: (w, h) => homeZoomRef.current(w, h),
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      centerOffsetY,
      getScale,
      reducedMotion: prefersReducedMotion,
      onViewChange: setView,
      onCamera: (center, zoom) => baseMapRef.current?.sync(center, zoom),
      backdropEl: backdropRef.current,
      backdropTile: RADAR_TILE,
      ringsEl: ringsRef.current,
      nearRadius: DIAMETER * 2.8,
      balloonZoom: BALLOON_ZOOM,
      nodes: [],
    });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [centerOffsetY, getScale]);

  useLayoutEffect(() => {
    engineRef.current?.setNodes(
      nodeSpecs.flatMap((n) => {
        const el = markerRefs.current.get(n.key);
        return el ? [{ ...n, el, scale, balloonEl: el.querySelector<HTMLElement>("[data-balloon]") }] : [];
      }),
    );
  });

  const initialCamera = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return null;
    const cam = engine.camera();
    return { center: { x: cam.x, y: cam.y + centerOffsetY / worldSize(cam.zoom) }, zoom: cam.zoom };
  }, [centerOffsetY]);

  const ignoreIfDragged = () => engineRef.current?.wasDragged() ?? false;
  const recenter = useCallback(() => engineRef.current?.recenter(), []);
  const reveal = (index: number) => (e: React.FocusEvent<HTMLElement>) =>
    e.currentTarget.matches(":focus-visible") && engineRef.current?.reveal(index);
  const openCluster = (members: number[]) => {
    const field = fieldRef.current;
    if (!field || !layout || ignoreIfDragged()) return;
    engineRef.current?.flyTo(
      clusterTarget(points, members, layout.zoom, field.clientWidth, field.clientHeight, MAX_ZOOM),
    );
  };
  const setMarker = (key: string) => (el: HTMLDivElement | null) => {
    if (el) markerRefs.current.set(key, el);
    else markerRefs.current.delete(key);
  };

  return (
    <div
      ref={fieldRef}
      className={`relative cursor-grab touch-none overflow-hidden select-none active:cursor-grabbing ${className}`}
      style={style}
      data-map-status={mapStatus}
    >
      <RadarMapBackdrop
        ref={backdropRef}
        className={`transition-opacity duration-500 ${mapStatus === "pronto" ? "opacity-0" : "opacity-100"}`}
      />
      <RadarBaseMap
        controllerRef={baseMapRef}
        onStatus={setMapStatus}
        initialCamera={initialCamera}
        ready={mapStatus === "pronto"}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(circle at center, rgb(28 38 49 / 0) 45%, rgb(28 38 49 / 0.55) 100%)" }}
        aria-hidden="true"
      />

      <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
        <g ref={ringsRef}>
          {RINGS_M.map((m) => (
            <circle
              key={m}
              data-m={m}
              r={0}
              fill="none"
              stroke="rgb(222 201 168 / 0.32)"
              strokeWidth={1.2}
              strokeDasharray="5 6"
            />
          ))}
          {RINGS_M.map((m) => (
            <text
              key={`t${m}`}
              data-m={m}
              x={0}
              textAnchor="middle"
              className="fill-areia/70 text-xs font-bold"
              style={{ paintOrder: "stroke", stroke: "rgb(27 37 48 / 0.85)", strokeWidth: 3 }}
            >
              {ringLabel(m)}
            </text>
          ))}
        </g>
      </svg>

      <div className="absolute inset-0">
        <button
          ref={youRef}
          type="button"
          onClick={() => !ignoreIfDragged() && onCenterClick()}
          onFocus={(e) => e.currentTarget.matches(":focus-visible") && recenter()}
          className="absolute top-0 left-0 z-[16] flex cursor-pointer flex-col items-center rounded-full will-change-transform"
        >
          <div className="relative flex flex-col items-center">
            <MolduraDoUsuario size={CENTER_SIZE} sombra="0 12px 28px rgba(0,0,0,0.55)">
              <Avatar cfg={state.user.avatar} />
            </MolduraDoUsuario>
            <span className="absolute -bottom-2.5 rounded-full border border-white/30 bg-noite px-2.5 py-0.5 text-xs font-extrabold text-white shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
              Você<span className="sr-only">, abrir meu perfil</span>
            </span>
          </div>
        </button>
        {layout &&
          visible.map((i) => {
            const item = layout.items[i];
            const lead = profiles[item.members[0]];
            if (item.members.length > 1) {
              const key = markerKey(item, profiles);
              const members = item.members.map((m) => profiles[m]);
              const near = Math.min(...members.map((p) => p.distanceM));
              const far = Math.max(...members.map((p) => p.distanceM));
              return (
                <div
                  key={key}
                  ref={setMarker(key)}
                  className="absolute top-0 left-0 z-[3] h-0 w-0 opacity-0 will-change-transform"
                >
                  <button
                    type="button"
                    onFocus={reveal(i)}
                    onClick={(e) => {
                      e.stopPropagation();
                      openCluster(item.members);
                    }}
                    className="absolute flex cursor-pointer flex-col items-center rounded-cartao"
                    style={{ left: -BUBBLE_BOX.halfW, top: -RADIUS, width: BUBBLE_BOX.halfW * 2 }}
                  >
                    <ClusterDisc lead={lead} count={item.members.length} />
                    <span
                      data-label
                      aria-hidden="true"
                      className="mt-1.5 rounded-full border border-white/20 bg-tinta/90 px-2 py-0.5 text-xs font-bold whitespace-nowrap text-white"
                    >
                      {item.members.length} pessoas
                    </span>
                    <span className="sr-only">
                      {`${item.members.length} pessoas, entre ${formatDistance(near)} e ${formatDistance(far)}. Aproximar o mapa para ver cada pessoa`}
                    </span>
                  </button>
                </div>
              );
            }
            const p = lead;
            const key = markerKey(item, profiles);
            const intention = INTENTIONS[p.primaryIntention];
            const shared = affinity?.get(p.id) ?? 0;
            const conversation = state.conversations[p.id];
            return (
              <div
                key={key}
                ref={setMarker(key)}
                className={`absolute top-0 left-0 h-0 w-0 opacity-0 will-change-transform ${hasTalked(conversation) ? "z-[12]" : "z-[5]"}`}
              >
                <div
                  className="absolute flex flex-col items-center"
                  style={{ left: -BUBBLE_BOX.halfW, top: -RADIUS, width: BUBBLE_BOX.halfW * 2 }}
                >
                  <button
                    type="button"
                    onFocus={reveal(i)}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!ignoreIfDragged()) dispatch({ type: "openProfile", id: p.id });
                    }}
                    className="flex cursor-pointer flex-col items-center rounded-cartao"
                  >
                    <div className="relative" data-avatar aria-hidden="true">
                      <OrbeVidro
                        cor={intention.color}
                        online={p.online}
                        size={DIAMETER}
                        sombra="0 10px 22px -6px rgb(6 10 15 / 55%)"
                      >
                        <ProfileImage cfg={p.avatar} photo={p.photo} />
                      </OrbeVidro>
                      {shared > 0 && (
                        <span className="absolute -top-1 -left-1 flex h-5 min-w-5 items-center justify-center rounded-full border border-tinta bg-areia px-1 text-xs font-extrabold text-tinta shadow">
                          {shared}
                        </span>
                      )}
                      <SelosStatus profile={p} variant="orbe" />
                    </div>
                    <div
                      data-label
                      className="mt-1.5 rounded-full border border-white/20 bg-tinta/90 px-2 py-0.5 text-xs font-bold whitespace-nowrap text-white"
                    >
                      {p.name} <span className="font-normal text-marfim-suave">{p.dist}</span>
                    </div>
                    <span className="sr-only">
                      , {intention.label}
                      {shared > 0 ? `, ${shared} ${shared === 1 ? "assunto" : "assuntos"} em comum` : ""}
                      {p.online ? ", online" : ""}
                      {p.visitingFrom ? `, de passagem, mora em ${p.visitingFrom}` : ""}
                      {p.inPark ? ", no Parque" : ""}. Ver perfil
                    </span>
                  </button>
                  {hasTalked(conversation) && (
                    <ConversationBalloon
                      name={p.name}
                      conversation={conversation}
                      onFocus={reveal(i)}
                      onOpen={(origin) => !ignoreIfDragged() && dispatch({ type: "openMiniChat", id: p.id, origin })}
                      nearOnly
                      style={{ left: BUBBLE_BOX.halfW + DIAMETER * 0.12, top: -24 }}
                    />
                  )}
                </div>
              </div>
            );
          })}
      </div>

      <div
        data-map-control
        className={`absolute z-30 flex flex-col items-end gap-2 ${compact ? "top-2.5 right-2.5" : "top-3.5 right-3.5"}`}
      >
        <RadarLocationControl compact={compact} />
        <div className="lg-bar flex flex-col overflow-hidden rounded-full" role="group" aria-label="Zoom do mapa">
          <button
            type="button"
            onClick={() => engineRef.current?.zoomBy(1)}
            aria-label="Aproximar o mapa"
            className="flex h-10 w-10 items-center justify-center text-lg font-bold text-white hover:bg-white/10"
          >
            +
          </button>
          <span className="h-px bg-white/15" aria-hidden="true" />
          <button
            type="button"
            onClick={() => engineRef.current?.zoomBy(-1)}
            aria-label="Afastar o mapa"
            className="flex h-10 w-10 items-center justify-center text-lg font-bold text-white hover:bg-white/10"
          >
            −
          </button>
        </div>
      </div>

      <MapAttribution compact={compact} failed={mapStatus === "falhou"} />

      <RecenterContext value={recenter}>{overlay}</RecenterContext>
    </div>
  );
}

/** Count disc for a cluster: a bit larger the more people it holds, ringed in the lead's intention color. */
function ClusterDisc({ lead, count }: { lead: Profile; count: number }) {
  const color = INTENTIONS[lead.primaryIntention].color;
  const size = Math.round(DIAMETER * (0.7 + 0.3 * Math.min(1, Math.log10(count) / 2.5)));
  return (
    <div className="flex items-center justify-center" style={{ width: DIAMETER, height: DIAMETER }} aria-hidden="true">
      <div
        className="flex items-center justify-center rounded-full bg-noite/95 font-extrabold text-white"
        style={{
          width: size,
          height: size,
          fontSize: size > 52 ? 18 : 15,
          boxShadow: `0 0 0 2.5px ${color}, 0 0 0 ${Math.round(size * 0.14)}px rgba(255,255,255,0.10), 0 10px 22px rgba(0,0,0,0.45)`,
        }}
      >
        {count > 999 ? "999+" : count}
      </div>
    </div>
  );
}

function MapAttribution({ compact, failed }: { compact: boolean; failed: boolean }) {
  return (
    <div
      data-map-control
      className={`absolute z-20 max-w-[70%] rounded-full bg-tinta/80 px-2 py-0.5 text-xs leading-snug text-marfim-suave ${
        compact ? "bottom-[142px] left-2.5" : "bottom-3 left-3"
      }`}
    >
      {failed ? (
        <span>Mapa indisponível agora: mostrando ruas ilustrativas.</span>
      ) : (
        MAP_ATTRIBUTION.map((a, i) => (
          <span key={a.href}>
            {i > 0 && " · "}
            <a href={a.href} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
              {a.label}
            </a>
          </span>
        ))
      )}
    </div>
  );
}
