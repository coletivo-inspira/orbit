"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { GraphSettingsPanel } from "@/components/graph/GraphSettingsPanel";
import { useGraphDisplay } from "@/components/graph/useGraphDisplay";
import { PinButton } from "@/components/graph/PinButton";
import { useGraphPins } from "@/components/graph/useGraphPins";
import { ConversationBalloon } from "@/components/orbita/ConversationBalloon";
import { ToggleChip } from "@/components/ui/ToggleChip";
import { prefersReducedMotion } from "@/lib/a11y/motion";
import { communityTopics } from "@/lib/community";
import { hasTalked } from "@/lib/conversas";
import { INTENTIONS } from "@/lib/data/intentions";
import { MUSIC_GENRES, profileGenres, userGenres } from "@/lib/data/music";
import { labelOf, TOPICS } from "@/lib/data/profileOptions";
import { forcesOf, viewDisplayOf } from "@/lib/engines/graphDisplay";
import {
  GraphViewEngine,
  type EdgeStyle,
  type GraphViewState,
  type PinMap,
  type VisualNode,
} from "@/lib/engines/graphView";
import {
  buildInterestGraph,
  focusSets,
  ForceLayout,
  hubSize,
  interestNodeRadius,
  type GraphEdge,
  type GraphNode,
  type GraphSources,
  type LinkOrigin,
} from "@/lib/engines/interestGraph";
import { normalizeSearch } from "@/lib/keywords";
import { useDevice } from "@/lib/state/device";
import { useOrbit } from "@/lib/state/OrbitProvider";
import type { Profile } from "@/lib/types";

const SPOTIFY_GREEN = "#1db954";
const GRAPH_BATCH = 150;
const GRAPH_MAX = 450;
const DISPLAY_KEY = "orbit:graph:conexoes:v1";
const PINS_KEY = "orbit:graph:conexoes:pins:v1";

const ORIGIN_STYLE: Record<LinkOrigin, EdgeStyle> = {
  perfil: { color: "rgb(245 240 231)", alpha: 0.2, dash: [] },
  comunidade: { color: "#dec9a8", alpha: 0.45, dash: [5, 4] },
  musica: { color: SPOTIFY_GREEN, alpha: 0.45, dash: [] },
};
const styleOf = (e: GraphEdge) => e.origin;

const SOURCE_CHIPS: { id: keyof GraphSources; label: string; swatch: React.ReactNode }[] = [
  { id: "perfil", label: "Perfil", swatch: <span className="h-0.5 w-4 rounded bg-marfim/70" /> },
  {
    id: "comunidade",
    label: "Comunidade",
    swatch: <span className="h-0 w-4 border-t-2 border-dashed border-areia" />,
  },
  {
    id: "musica",
    label: "Spotify",
    swatch: <span className="h-0.5 w-4 rounded" style={{ background: SPOTIFY_GREEN }} />,
  },
];

function nodeLabel(node: GraphNode): string {
  switch (node.kind) {
    case "me":
      return "Você";
    case "person":
      return node.profile.name;
    case "topic":
      return labelOf(TOPICS, node.topic);
    case "genre":
      return `♪ ${MUSIC_GENRES[node.genre]}`;
  }
}

const ORIGIN_LABEL: Record<LinkOrigin, string> = { perfil: "perfil", comunidade: "Comunidade", musica: "Spotify" };

function visualOf(node: GraphNode, user: Profile["avatar"], userRing: string): VisualNode {
  const label = nodeLabel(node);
  switch (node.kind) {
    case "me":
      return {
        id: node.id,
        kind: "avatar",
        radius: 28,
        avatar: { cfg: user },
        ring: userRing,
        ringWidth: 3.5,
        label,
        alwaysLabel: true,
      };
    case "person":
      return {
        id: node.id,
        kind: "avatar",
        radius: 20,
        avatar: { cfg: node.profile.avatar, photo: node.profile.photo },
        ring: INTENTIONS[node.profile.primaryIntention].color,
        ringWidth: 2.5,
        label,
      };
    case "topic":
      return {
        id: node.id,
        kind: "dot",
        radius: hubSize(node.degree) / 2,
        fill: "#ded6ca",
        label,
        labelColor: "#cbd5e1",
      };
    case "genre":
      return {
        id: node.id,
        kind: "dot",
        radius: hubSize(node.degree) / 2,
        fill: SPOTIFY_GREEN,
        label,
        labelColor: "#a7f3d0",
      };
  }
}

/** Obsidian-style graph of people linked by the interests they share. */
export function InterestGraph({
  profiles,
  centerOffsetY = 0,
  compact,
  className = "",
  style,
}: {
  profiles: Profile[];
  centerOffsetY?: number;
  compact: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { state, dispatch } = useOrbit();
  const { getScale, device } = useDevice();
  const [sources, setSources] = useState<GraphSources>({ perfil: true, comunidade: true, musica: true });
  const [focus, setFocus] = useState<number | null>(null);
  const [limit, setLimit] = useState(GRAPH_BATCH);
  const [showOrphans, setShowOrphans] = useState(true);
  const [search, setSearch] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { display, update: updateDisplay, reset: resetDisplay } = useGraphDisplay(DISPLAY_KEY);
  const { pins, setPins } = useGraphPins(PINS_KEY);
  const latest = useRef({ display, pins });
  useLayoutEffect(() => {
    latest.current = { display, pins };
  });
  /** Positions and camera of the previous engine: a rebuild (filter, chip, "Mostrar mais") warm starts from them. */
  const positionsRef = useRef<Map<string, { x: number; y: number }> | null>(null);
  const viewRef = useRef<GraphViewState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const balloonRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GraphViewEngine<GraphEdge> | null>(null);

  // The nearest people (in the current sort) only: a graph of 1000+ nodes is neither readable nor light on a phone.
  const shownPeople = Math.min(limit, profiles.length, GRAPH_MAX);
  const people = useMemo(() => profiles.slice(0, shownPeople), [profiles, shownPeople]);
  const community = useMemo(() => communityTopics(state.posts), [state.posts]);
  const graph = useMemo(() => {
    const input = {
      profiles: people,
      userTopics: state.user.topics,
      userGenres: userGenres(state.user),
      genresOf: profileGenres,
      community,
      sources,
    };
    const full = buildInterestGraph(input);
    if (showOrphans) return full;
    const linked = people.filter((_, i) => full.incident[i + 1].length > 0);
    return linked.length === people.length ? full : buildInterestGraph({ ...input, profiles: linked });
  }, [people, state.user, community, sources, showOrphans]);
  const userRing = INTENTIONS[state.user.primaryIntention]?.color ?? "#dec9a8";
  const visuals = useMemo(
    () => graph.nodes.map((n) => visualOf(n, state.user.avatar, userRing)),
    [graph, state.user.avatar, userRing],
  );

  // A new graph invalidates the focused index; resetting during render avoids a stale highlight frame.
  const [graphForFocus, setGraphForFocus] = useState(graph);
  if (graphForFocus !== graph) {
    setGraphForFocus(graph);
    setFocus(null);
  }

  const focusRef = useRef(focus);
  useLayoutEffect(() => {
    focusRef.current = focus;
  });
  const onNodeClick = useCallback(
    (i: number) => {
      const node = graph.nodes[i];
      if (node.kind === "person" && focusRef.current === i) {
        dispatch({ type: "openProfile", id: node.id });
        return;
      }
      setFocus(focusRef.current === i ? null : i);
    },
    [graph, dispatch],
  );

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const { display: d, pins: storedPins } = latest.current;
    const layout = new ForceLayout(graph, {
      radius: (i) => interestNodeRadius(graph.nodes[i]),
      initial: positionsRef.current ?? undefined,
      forces: forcesOf(d),
    });
    layout.radiusScale = d.nodeSize;
    const engine = new GraphViewEngine({
      container,
      canvas,
      nodes: visuals,
      edges: graph.edges,
      incident: graph.incident,
      edgeStyles: ORIGIN_STYLE,
      styleOf,
      layout,
      getScale,
      reducedMotion: prefersReducedMotion,
      centerOffsetY,
      onNodeClick,
      onBackgroundTap: () => setFocus(null),
      onPinsChange: (next: PinMap) => {
        // Keep pins of people not shown right now (another filter may bring them back).
        const merged: PinMap = new Map(latest.current.pins);
        graph.nodes.forEach((n) => merged.delete(n.id));
        next.forEach((p, id) => merged.set(id, p));
        setPins(merged);
      },
      neighborhood: (i) => focusSets(graph, i),
      display: viewDisplayOf(d),
      initialView: viewRef.current,
      pins: storedPins,
    });
    engineRef.current = engine;
    return () => {
      positionsRef.current = layout.positions();
      viewRef.current = engine.view();
      engine.destroy();
      engineRef.current = null;
    };
  }, [graph, visuals, getScale, centerOffsetY, onNodeClick, setPins]);

  useEffect(() => {
    engineRef.current?.setDisplay(viewDisplayOf(display));
    engineRef.current?.setForces(forcesOf(display), display.nodeSize);
  }, [display, graph]);

  const matches = useMemo(() => {
    const q = normalizeSearch(search);
    if (!q) return null;
    const out = new Set<number>();
    graph.nodes.forEach((node, i) => normalizeSearch(nodeLabel(node)).includes(q) && out.add(i));
    return out;
  }, [graph, search]);
  useEffect(() => engineRef.current?.setSearch(matches), [matches, graph]);
  useEffect(() => engineRef.current?.setFocus(focus), [focus, graph]);

  const focusedNode = focus !== null ? graph.nodes[focus] : undefined;
  const conversation = focusedNode?.kind === "person" ? state.conversations[focusedNode.id] : undefined;
  const showBalloon = Boolean(focusedNode?.kind === "person" && conversation && hasTalked(conversation));
  useLayoutEffect(() => {
    engineRef.current?.setAnchor(showBalloon ? balloonRef.current : null, focus ?? -1);
  }, [showBalloon, focus, graph]);

  const hubsOf = (i: number) =>
    graph.incident[i].map((e) => {
      const edge = graph.edges[e];
      return `${nodeLabel(graph.nodes[edge.target])}${edge.origin === "perfil" ? "" : ` (via ${ORIGIN_LABEL[edge.origin]})`}`;
    });
  const pinnedHere = graph.nodes.filter((n) => pins.has(n.id)).length;
  const focusPinned = focus !== null && focusedNode ? pins.has(focusedNode.id) : false;

  return (
    <div
      ref={containerRef}
      className={`relative cursor-grab touch-none overflow-hidden select-none ${className}`}
      style={style}
    >
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />

      {/* The canvas is not accessible: one button per node for keyboard and screen readers. */}
      <ul className="sr-only" aria-label="Pessoas e interesses no grafo">
        {graph.nodes.map((node, i) => (
          <li key={node.id}>
            <button
              type="button"
              onFocus={() => {
                engineRef.current?.setKeyboardFocus(i);
                engineRef.current?.reveal(i);
              }}
              onBlur={() => engineRef.current?.setKeyboardFocus(null)}
              onClick={() => onNodeClick(i)}
            >
              {nodeA11yLabel(node, hubsOf(i), focus === i)}
            </button>
          </li>
        ))}
      </ul>

      <div ref={balloonRef} className="pointer-events-none absolute top-0 left-0 z-10" hidden={!showBalloon}>
        {showBalloon && focusedNode?.kind === "person" && conversation && (
          <ConversationBalloon
            name={focusedNode.profile.name}
            conversation={conversation}
            onOpen={(origin) =>
              !engineRef.current?.wasDragged() && dispatch({ type: "openMiniChat", id: focusedNode.id, origin })
            }
            className="pointer-events-auto"
          />
        )}
      </div>

      <div
        data-graph-control
        role="group"
        aria-label="Origem das conexões"
        className="orbit-scroll absolute top-2.5 right-2.5 left-2.5 z-20 flex gap-1.5 overflow-x-auto pb-1"
      >
        {SOURCE_CHIPS.map((chip) => (
          <ToggleChip
            key={chip.id}
            pressed={sources[chip.id]}
            onToggle={() => setSources((s) => ({ ...s, [chip.id]: !s[chip.id] }))}
          >
            <span className="flex items-center" aria-hidden="true">
              {chip.swatch}
            </span>
            {chip.label}
          </ToggleChip>
        ))}
      </div>

      {profiles.length > GRAPH_BATCH && (
        <div
          data-graph-control
          className="lg-bar absolute top-12 left-2.5 z-20 flex max-w-[calc(100%-20px)] items-center gap-2 rounded-full py-1 pr-1 pl-3 text-[11px] text-white"
        >
          <span role="status">
            {shownPeople} de {profiles.length} pessoas, as mais próximas
          </span>
          {shownPeople < Math.min(profiles.length, GRAPH_MAX) ? (
            <button
              type="button"
              onClick={() => setLimit((l) => l + GRAPH_BATCH)}
              className="lg-pill shrink-0 rounded-full px-2.5 py-1 font-bold"
            >
              Mostrar mais
            </button>
          ) : (
            shownPeople < profiles.length && <span className="pr-2 text-slate-300">Use os filtros para ver outras</span>
          )}
        </div>
      )}

      {focusedNode && (
        <FocusCard
          node={focusedNode}
          hubs={hubsOf(focus!)}
          compact={compact}
          pinned={focusPinned}
          onTogglePin={focus! > 0 ? () => engineRef.current?.togglePin(focus!) : undefined}
          onOpenProfile={(id) => dispatch({ type: "openProfile", id })}
          onClear={() => setFocus(null)}
        />
      )}

      <div
        data-graph-control
        className={`lg-bar absolute z-20 flex items-center gap-1 rounded-full p-1 ${compact ? "right-3.5 bottom-[88px]" : "right-4 bottom-4"}`}
      >
        <button
          type="button"
          onClick={() => engineRef.current?.zoomBy(1 / 1.25)}
          aria-label="Afastar"
          className="flex h-8 w-8 items-center justify-center rounded-full text-base font-bold text-white hover:bg-white/10"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => engineRef.current?.zoomBy(1.25)}
          aria-label="Aproximar"
          className="flex h-8 w-8 items-center justify-center rounded-full text-base font-bold text-white hover:bg-white/10"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => engineRef.current?.fit()}
          className="rounded-full px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
        >
          Ajustar
        </button>
        {device !== "watch" && (
          <button
            type="button"
            onClick={() => setSettingsOpen((o) => !o)}
            aria-expanded={settingsOpen}
            aria-label="Configurações do grafo"
            title="Configurações do grafo"
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm text-white ${settingsOpen ? "bg-white/15" : "hover:bg-white/10"}`}
          >
            ⚙
          </button>
        )}
      </div>

      {settingsOpen && device !== "watch" && (
        <GraphSettingsPanel
          display={display}
          onChange={updateDisplay}
          onReset={resetDisplay}
          onAnimate={() => engineRef.current?.replay()}
          pinnedCount={pinnedHere}
          onUnpinAll={() => engineRef.current?.unpinAll()}
          search={search}
          onSearch={setSearch}
          toggles={[
            {
              id: "orfaos",
              label: "Órfãos (sem nada em comum)",
              checked: showOrphans,
              onToggle: () => setShowOrphans((v) => !v),
            },
          ]}
          compact={compact}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}

function nodeA11yLabel(node: GraphNode, hubs: string[], selected: boolean): string {
  const list = hubs.length ? hubs.join(", ") : "nenhuma conexão com esses filtros";
  switch (node.kind) {
    case "me":
      return `Você. Seus interesses em comum com alguém por perto: ${list}.`;
    case "person":
      return `${node.profile.name}, ${INTENTIONS[node.profile.primaryIntention].label}. Interesses: ${list}. ${selected ? "Abrir perfil" : "Ver conexões"}`;
    case "topic":
      return `Assunto ${labelOf(TOPICS, node.topic)}, ${node.degree} pessoas.`;
    case "genre":
      return `Gênero musical ${MUSIC_GENRES[node.genre]}, ${node.degree} pessoas no Spotify.`;
  }
}

function FocusCard({
  node,
  hubs,
  compact,
  pinned,
  onTogglePin,
  onOpenProfile,
  onClear,
}: {
  node: GraphNode;
  hubs: string[];
  compact: boolean;
  pinned: boolean;
  onTogglePin?: () => void;
  onOpenProfile: (id: string) => void;
  onClear: () => void;
}) {
  const title = node.kind === "person" ? node.profile.name : node.kind === "me" ? "Você" : nodeLabel(node);
  const detail =
    node.kind === "topic" || node.kind === "genre"
      ? `${node.degree} pessoas ligadas${node.kind === "genre" ? " pelo Spotify" : ""}`
      : hubs.length
        ? hubs.join(" · ")
        : "Sem interesses em comum com esses filtros";
  return (
    <div
      data-graph-control
      className={`lg-bar absolute z-20 flex items-center gap-2 rounded-2xl px-3 py-2 ${compact ? "right-3.5 bottom-[136px] left-3.5" : "bottom-4 left-4 max-w-[60%]"}`}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-bold text-white">{title}</div>
        <div className="line-clamp-2 text-[11px] leading-snug text-slate-300">{detail}</div>
      </div>
      {onTogglePin && <PinButton pinned={pinned} onToggle={onTogglePin} />}
      {node.kind === "person" && (
        <button
          type="button"
          onClick={() => onOpenProfile(node.id)}
          className="lg-btn-primary shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold"
        >
          Ver perfil
        </button>
      )}
      <button
        type="button"
        onClick={onClear}
        aria-label="Limpar destaque"
        className="lg-pill flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs text-white"
      >
        ✕
      </button>
    </div>
  );
}
