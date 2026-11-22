"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { GraphSettingsPanel } from "@/components/graph/GraphSettingsPanel";
import { useGraphDisplay } from "@/components/graph/useGraphDisplay";
import { MolduraDoUsuario } from "@/components/molduras/MolduraAvatar";
import { ConversationBalloon } from "@/components/orbita/ConversationBalloon";
import { Avatar, ProfileImage } from "@/components/ui/Avatar";
import { ToggleChip } from "@/components/ui/ToggleChip";
import { prefersReducedMotion } from "@/lib/a11y/motion";
import { communityTopics } from "@/lib/community";
import { hasTalked } from "@/lib/conversas";
import { INTENTIONS } from "@/lib/data/intentions";
import { MUSIC_GENRES, profileGenres, userGenres } from "@/lib/data/music";
import { labelOf, TOPICS } from "@/lib/data/profileOptions";
import { forcesOf, viewDisplayOf } from "@/lib/engines/graphDisplay";
import { GraphViewEngine, type EdgeStyle, type GraphViewState } from "@/lib/engines/graphView";
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
import { CloseButton } from "@/components/ui/Button";

const SPOTIFY_GREEN = "#1db954";
const GRAPH_BATCH = 150;
const GRAPH_MAX = 450;
const DISPLAY_KEY = "orbit:graph:conexoes:v1";

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
  const displayRef = useRef(display);
  useLayoutEffect(() => {
    displayRef.current = display;
  });
  /** Positions and camera of the previous engine: a rebuild (filter, chip, "Mostrar mais") warm starts from them. */
  const positionsRef = useRef<Map<string, { x: number; y: number }> | null>(null);
  const viewRef = useRef<GraphViewState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
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

  // A new graph invalidates the focused index; resetting during render avoids a stale highlight frame.
  const [graphForFocus, setGraphForFocus] = useState(graph);
  if (graphForFocus !== graph) {
    setGraphForFocus(graph);
    setFocus(null);
  }

  useEffect(() => {
    const container = containerRef.current;
    const world = worldRef.current;
    const canvas = canvasRef.current;
    if (!container || !world || !canvas) return;
    const d = displayRef.current;
    const layout = new ForceLayout(graph, {
      radius: (i) => interestNodeRadius(graph.nodes[i]),
      initial: positionsRef.current ?? undefined,
      forces: forcesOf(d),
    });
    layout.radiusScale = d.nodeSize;
    const engine = new GraphViewEngine({
      container,
      world,
      canvas,
      nodeEls: nodeRefs.current.slice(0, graph.nodes.length),
      edges: graph.edges,
      edgeStyles: ORIGIN_STYLE,
      styleOf,
      layout,
      getScale,
      reducedMotion: prefersReducedMotion,
      centerOffsetY,
      onBackgroundTap: () => setFocus(null),
      display: viewDisplayOf(d),
      initialView: viewRef.current,
    });
    engineRef.current = engine;
    return () => {
      positionsRef.current = layout.positions();
      viewRef.current = engine.view();
      engine.destroy();
      engineRef.current = null;
    };
  }, [graph, getScale, centerOffsetY]);

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

  const lit = useMemo(() => (focus === null ? null : focusSets(graph, focus)), [graph, focus]);
  const focusColor =
    focus !== null && graph.nodes[focus]?.kind === "person"
      ? INTENTIONS[(graph.nodes[focus] as Extract<GraphNode, { kind: "person" }>).profile.primaryIntention].color
      : "#dec9a8";
  useEffect(() => {
    if (lit) engineRef.current?.setHighlight({ direct: lit.direct, shared: lit.shared, color: focusColor });
    else if (matches) {
      const direct = new Set<number>();
      matches.forEach((i) => graph.incident[i].forEach((e) => direct.add(e)));
      engineRef.current?.setHighlight({ direct, shared: new Set(), color: "#dec9a8" });
    } else engineRef.current?.setHighlight(null);
  }, [lit, matches, focusColor, graph]);
  const ignoreIfDragged = () => engineRef.current?.wasDragged() ?? false;

  const hubsOf = (i: number) =>
    graph.incident[i].map((e) => {
      const edge = graph.edges[e];
      return `${nodeLabel(graph.nodes[edge.target])}${edge.origin === "perfil" ? "" : ` (via ${ORIGIN_LABEL[edge.origin]})`}`;
    });

  const onNodeClick = (i: number) => {
    if (ignoreIfDragged()) return;
    const node = graph.nodes[i];
    if (node.kind === "person" && focus === i) {
      dispatch({ type: "openProfile", id: node.id });
      return;
    }
    setFocus(focus === i ? null : i);
  };

  return (
    <div
      ref={containerRef}
      className={`group/graph relative cursor-grab touch-none overflow-hidden select-none active:cursor-grabbing ${className}`}
      style={{ ...style, ["--node-scale" as string]: display.nodeSize }}
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full group-data-[settling=true]/graph:invisible"
        aria-hidden="true"
      />
      <div
        role="status"
        className="pointer-events-none absolute inset-0 hidden items-center justify-center group-data-[settling=true]/graph:flex"
      >
        <span className="lg-bar flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold text-white">
          <span className="h-2 w-2 animate-pulse rounded-full bg-areia" aria-hidden="true" />
          Organizando conexões…
        </span>
      </div>
      <div
        ref={worldRef}
        className="absolute top-0 left-0 origin-top-left will-change-transform group-data-[settling=true]/graph:invisible"
      >
        {graph.nodes.map((node, i) => {
          const dim = (lit && !lit.nodes.has(i)) || (!lit && matches && !matches.has(i));
          const emphasized = Boolean(lit?.nodes.has(i) || matches?.has(i));
          const selected = focus === i;
          const conversation = node.kind === "person" ? state.conversations[node.id] : undefined;
          return (
            <div
              key={node.id}
              ref={(el) => {
                nodeRefs.current[i] = el;
              }}
              data-node-index={i}
              className="absolute top-0 left-0 transition-opacity duration-200 will-change-transform"
              style={{ opacity: dim ? 0.22 : 1, zIndex: selected ? 3 : node.kind === "me" ? 2 : 1 }}
            >
              <button
                type="button"
                onFocus={(e) => {
                  if (!e.currentTarget.matches(":focus-visible")) return;
                  setFocus(i);
                  engineRef.current?.reveal(i);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onNodeClick(i);
                }}
                className="relative block origin-center cursor-pointer rounded-full"
                style={{ transform: "scale(var(--node-scale, 1))" }}
              >
                <NodeDot node={node} selected={selected} userAvatar={state.user.avatar} />
                <span
                  className={`pointer-events-none absolute top-full left-1/2 mt-1 -translate-x-1/2 whitespace-nowrap ${
                    emphasized || node.kind === "me" ? "" : "group-data-[zoom=far]/graph:hidden"
                  } ${
                    node.kind === "person" || node.kind === "me"
                      ? "rounded-full border border-white/20 bg-tinta/90 px-1.5 py-px text-xs font-bold text-white"
                      : `text-xs font-semibold ${node.kind === "genre" ? "text-salvia" : "text-marfim-suave"}`
                  }`}
                  aria-hidden="true"
                >
                  {nodeLabel(node)}
                </span>
                <span className="sr-only">{nodeA11yLabel(node, hubsOf(i), selected)}</span>
              </button>
              {selected && conversation && hasTalked(conversation) && node.kind === "person" && (
                <ConversationBalloon
                  name={node.profile.name}
                  conversation={conversation}
                  onOpen={(origin) => !ignoreIfDragged() && dispatch({ type: "openMiniChat", id: node.id, origin })}
                  className="-top-6 left-[62%]"
                />
              )}
            </div>
          );
        })}
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
          className="lg-bar absolute top-12 left-2.5 z-20 flex max-w-[calc(100%-20px)] items-center gap-2 rounded-full py-1 pr-1 pl-3 text-xs text-white"
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
            shownPeople < profiles.length && (
              <span className="pr-2 text-marfim-suave">Use os filtros para ver outras</span>
            )
          )}
        </div>
      )}

      {focus !== null && graph.nodes[focus] && (
        <FocusCard
          node={graph.nodes[focus]}
          hubs={hubsOf(focus)}
          compact={compact}
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
          className="relative flex h-9 w-9 items-center justify-center rounded-full after:absolute after:-inset-1 after:content-[''] text-base font-bold text-white hover:bg-white/10"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => engineRef.current?.zoomBy(1.25)}
          aria-label="Aproximar"
          className="relative flex h-9 w-9 items-center justify-center rounded-full after:absolute after:-inset-1 after:content-[''] text-base font-bold text-white hover:bg-white/10"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => engineRef.current?.fit()}
          className="rounded-full px-3 min-h-9 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
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
            className={`relative flex h-9 w-9 items-center justify-center rounded-full after:absolute after:-inset-1 after:content-[''] text-sm text-white ${settingsOpen ? "bg-white/15" : "hover:bg-white/10"}`}
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

function NodeDot({
  node,
  selected,
  userAvatar,
}: {
  node: GraphNode;
  selected: boolean;
  userAvatar: Profile["avatar"];
}) {
  if (node.kind === "me") {
    return (
      <MolduraDoUsuario size={56} sombra="0 10px 24px rgba(0,0,0,0.5)">
        <Avatar cfg={userAvatar} />
      </MolduraDoUsuario>
    );
  }
  if (node.kind === "person") {
    const color = INTENTIONS[node.profile.primaryIntention].color;
    return (
      <span
        className="block h-10 w-10 overflow-hidden rounded-full"
        style={{
          boxShadow: `0 0 0 2px ${color}${selected ? `, 0 0 0 6px ${color}55` : ""}, 0 6px 14px rgba(0,0,0,0.45)`,
        }}
        aria-hidden="true"
      >
        <ProfileImage cfg={node.profile.avatar} photo={node.profile.photo} />
      </span>
    );
  }
  const size = hubSize(node.degree);
  return (
    <span
      className="block rounded-full"
      style={{
        width: size,
        height: size,
        background: node.kind === "genre" ? SPOTIFY_GREEN : "rgb(222 214 202)",
        boxShadow: selected ? "0 0 0 4px rgb(222 201 168 / 45%)" : "0 0 0 2px rgb(28 38 49 / 70%)",
      }}
      aria-hidden="true"
    />
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
  onOpenProfile,
  onClear,
}: {
  node: GraphNode;
  hubs: string[];
  compact: boolean;
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
      className={`lg-bar absolute z-20 flex items-center gap-2 rounded-cartao px-3 py-2 ${compact ? "right-3.5 bottom-[136px] left-3.5" : "bottom-4 left-4 max-w-[60%]"}`}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-bold text-white">{title}</div>
        <div className="line-clamp-2 text-xs leading-snug text-marfim-suave">{detail}</div>
      </div>
      {node.kind === "person" && (
        <button
          type="button"
          onClick={() => onOpenProfile(node.id)}
          className="lg-btn-primary shrink-0 rounded-full px-3 min-h-9 py-1.5 text-xs font-bold"
        >
          Ver perfil
        </button>
      )}
      <CloseButton onClose={onClear} label="Limpar destaque" size="compacto" />
    </div>
  );
}
