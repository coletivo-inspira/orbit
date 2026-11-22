"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { GraphSettingsPanel } from "@/components/graph/GraphSettingsPanel";
import { PinButton } from "@/components/graph/PinButton";
import { useGraphDisplay } from "@/components/graph/useGraphDisplay";
import { useGraphPins } from "@/components/graph/useGraphPins";

import { prefersReducedMotion } from "@/lib/a11y/motion";
import { useDialogFocus } from "@/lib/a11y/useDialogFocus";
import {
  activeAt,
  buildCommunityTimeline,
  formatHoursAgo,
  type CommunityTimeline,
  type TimelineEdge,
  type TimelineNode,
} from "@/lib/communityTimeline";
import { COMMUNITY_CATEGORIES } from "@/lib/data/intentions";
import { profileById } from "@/lib/data/profiles";
import { forcesOf, viewDisplayOf } from "@/lib/engines/graphDisplay";
import { ForceLayout } from "@/lib/engines/forceLayout";
import {
  GraphViewEngine,
  type EdgeStyle,
  type GraphViewState,
  type PinMap,
  type VisualNode,
} from "@/lib/engines/graphView";
import { normalizeSearch } from "@/lib/keywords";
import { useDevice } from "@/lib/state/device";
import { useOrbit } from "@/lib/state/OrbitProvider";
import type { AvatarConfig, CommunityCategory, CommunityPost } from "@/lib/types";

const STEP_MS = 900;
const SPEEDS = [1, 2, 4] as const;
const DISPLAY_KEY = "orbit:graph:linha-do-tempo:v1";
const PINS_KEY = "orbit:graph:linha-do-tempo:pins:v1";

const CATEGORY_COLOR: Record<CommunityCategory, string> = {
  vacinas: "#67e8f9",
  prevencao: "#6ee7b7",
  bemestar: "#c4b5fd",
  debates: "#fcd34d",
};

const EDGE_STYLES: Record<TimelineEdge["kind"], EdgeStyle> = {
  comentario: { color: "rgb(245 240 231)", alpha: 0.5, dash: [] },
  resposta: { color: "#c4b5fd", alpha: 0.7, dash: [4, 3] },
  tag: { color: "#dec9a8", alpha: 0.32, dash: [] },
};
const styleOf = (e: TimelineEdge) => e.kind;

const RADIUS: Record<TimelineNode["kind"], number> = { post: 18, comment: 14, reply: 12, tag: 6 };

function charge(node: TimelineNode): number {
  if (node.kind === "post") return -320;
  if (node.kind === "tag") return -90 - Math.min(node.uses, 8) * 12;
  return node.kind === "comment" ? -170 : -140;
}

function visualOf(node: TimelineNode, userAvatar: AvatarConfig): VisualNode {
  const radius = RADIUS[node.kind];
  const label = nodeLabel(node);
  if (node.kind === "tag") return { id: node.id, kind: "dot", radius, fill: "#dec9a8", label, labelColor: "#dec9a8" };
  if (node.kind === "post") {
    return {
      id: node.id,
      kind: "badge",
      radius,
      fill: "#27323d",
      ring: CATEGORY_COLOR[node.category],
      ringWidth: 3,
      glyph: COMMUNITY_CATEGORIES[node.category].label.split(" ")[0],
      label,
      alwaysLabel: true,
    };
  }
  const ring = node.kind === "reply" ? "#c4b5fd" : "rgb(245 240 231 / 80%)";
  const profile = node.profileId && node.profileId !== "me" ? profileById(node.profileId) : undefined;
  const cfg = node.profileId === "me" || node.local ? userAvatar : profile?.avatar;
  if (cfg) {
    return { id: node.id, kind: "avatar", radius, avatar: { cfg, photo: profile?.photo }, ring, ringWidth: 2, label };
  }
  return {
    id: node.id,
    kind: "badge",
    radius,
    fill: "#313d49",
    ring,
    ringWidth: 2,
    glyph: node.author.charAt(0),
    label,
  };
}

function nodeLabel(node: TimelineNode): string {
  if (node.kind === "post") return node.title.length > 34 ? `${node.title.slice(0, 33).trimEnd()}…` : node.title;
  if (node.kind === "tag") return `#${node.tag}`;
  return node.author;
}

function searchText(node: TimelineNode): string {
  if (node.kind === "post") return `${node.title} ${node.author}`;
  if (node.kind === "tag") return node.tag;
  return `${node.author} ${node.text}`;
}

/**
 * Replays the community as a growing graph, like Obsidian's timelapse: each post appears when it was
 * written, then its comments and replies, linked to the tags (keywords) they bring.
 */
export function CommunityTimelapse({
  posts,
  compact,
  onClose,
  onOpenPost,
}: {
  posts: CommunityPost[];
  compact: boolean;
  onClose: () => void;
  onOpenPost: (id: string) => void;
}) {
  const { state } = useOrbit();
  const { getScale, device } = useDevice();
  const [showTags, setShowTags] = useState(true);
  const [search, setSearch] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { display, update: updateDisplay, reset: resetDisplay } = useGraphDisplay(DISPLAY_KEY);
  const { pins, setPins } = useGraphPins(PINS_KEY);
  const timeline = useMemo(() => buildCommunityTimeline(posts, { tags: showTags }), [posts, showTags]);
  const last = timeline.steps.length - 1;
  const [step, setStep] = useState(() => (prefersReducedMotion() ? last : -1));
  const [playing, setPlaying] = useState(() => !prefersReducedMotion() && last >= 0);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [focus, setFocus] = useState<number | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const onKeyDown = useDialogFocus(dialogRef, titleRef, onClose);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GraphViewEngine<TimelineEdge> | null>(null);
  const positionsRef = useRef<Map<string, { x: number; y: number }> | null>(null);
  const viewRef = useRef<GraphViewState | null>(null);
  const latest = useRef({ display, step, pins });
  useLayoutEffect(() => {
    latest.current = { display, step, pins };
  });
  const visuals = useMemo(
    () => timeline.nodes.map((n) => visualOf(n, state.user.avatar)),
    [timeline, state.user.avatar],
  );
  const toggleFocus = useCallback((i: number) => setFocus((f) => (f === i ? null : i)), []);

  // A rebuilt timeline (tags on/off, new comment) invalidates the focused index.
  const [timelineForFocus, setTimelineForFocus] = useState(timeline);
  if (timelineForFocus !== timeline) {
    setTimelineForFocus(timeline);
    setFocus(null);
  }

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const { display: d, step: s, pins: storedPins } = latest.current;
    const layout = new ForceLayout(timeline, {
      charge: (i) => charge(timeline.nodes[i]),
      radius: (i) => RADIUS[timeline.nodes[i].kind],
      initial: positionsRef.current ?? undefined,
      forces: forcesOf(d),
    });
    layout.radiusScale = d.nodeSize;
    layout.active.set(activeAt(timeline, s));
    const engine = new GraphViewEngine({
      container,
      canvas,
      nodes: visuals,
      edges: timeline.edges,
      incident: timeline.incident,
      edgeStyles: EDGE_STYLES,
      styleOf,
      layout,
      getScale,
      reducedMotion: prefersReducedMotion,
      centerOffsetY: 0,
      onNodeClick: toggleFocus,
      onBackgroundTap: () => setFocus(null),
      onPinsChange: (next: PinMap) => setPins(next),
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
  }, [timeline, visuals, getScale, toggleFocus, setPins]);

  useEffect(() => {
    engineRef.current?.setActive(activeAt(timeline, step), timeline.near);
  }, [timeline, step]);

  useEffect(() => {
    engineRef.current?.setDisplay(viewDisplayOf(display));
    engineRef.current?.setForces(forcesOf(display), display.nodeSize);
  }, [display, timeline]);

  useEffect(() => {
    if (!playing) return;
    if (step >= last) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the replay stops itself at the end
      setPlaying(false);
      return;
    }
    const id = window.setTimeout(() => setStep((s) => Math.min(last, s + 1)), STEP_MS / speed);
    return () => window.clearTimeout(id);
  }, [playing, step, last, speed]);

  const matches = useMemo(() => {
    const q = normalizeSearch(search);
    if (!q) return null;
    const out = new Set<number>();
    timeline.nodes.forEach((n, i) => normalizeSearch(searchText(n)).includes(q) && out.add(i));
    return out;
  }, [timeline, search]);
  useEffect(() => engineRef.current?.setSearch(matches), [matches, timeline]);
  useEffect(() => engineRef.current?.setFocus(focus), [focus, timeline]);

  const restart = () => {
    setFocus(null);
    engineRef.current?.fit();
    setStep(-1);
    setPlaying(true);
  };
  const togglePlay = () => {
    if (step >= last) restart();
    else setPlaying((p) => !p);
  };
  const current = step >= 0 ? timeline.steps[step] : null;
  useEffect(() => engineRef.current?.setFresh(current ? new Set(current.nodes) : null), [current, timeline]);
  const counts = useMemo(() => {
    let comments = 0;
    let tags = 0;
    timeline.nodes.forEach((n, i) => {
      if (timeline.stepOf[i] > step) return;
      if (n.kind === "comment" || n.kind === "reply") comments++;
      if (n.kind === "tag") tags++;
    });
    const postsShown = timeline.nodes.filter((n, i) => n.kind === "post" && timeline.stepOf[i] <= step).length;
    return { posts: postsShown, comments, tags };
  }, [timeline, step]);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="absolute inset-0 z-40 flex flex-col bg-tinta outline-none"
    >
      <div
        className={`lg-header flex shrink-0 items-start justify-between gap-2 ${compact ? "px-4 pt-2.5 pb-2.5" : "px-6 pt-4 pb-3"}`}
      >
        <div className="min-w-0">
          <h2
            ref={titleRef}
            id={titleId}
            tabIndex={-1}
            className={`${compact ? "text-base" : "text-xl"} font-bold tracking-tight text-white outline-none`}
          >
            Linha do tempo da comunidade
          </h2>
          <p className="mt-0.5 text-[11px] leading-snug text-slate-300">
            Posts, comentários e respostas aparecem na ordem em que aconteceram, ligados às tags de cada um.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar linha do tempo"
          className="lg-pill flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm text-white"
        >
          ✕
        </button>
      </div>

      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 cursor-grab touch-none overflow-hidden select-none"
        style={{ background: "radial-gradient(circle at center, #2a3644 0%, rgb(28 38 49 / 0) 75%)" }}
      >
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />
        {/* The canvas is not accessible: one button per visible node for keyboard and screen readers. */}
        <ul className="sr-only" aria-label="Publicações, comentários e tags na linha do tempo">
          {timeline.nodes.map((node, i) =>
            timeline.stepOf[i] <= step ? (
              <li key={node.id}>
                <button
                  type="button"
                  onFocus={() => {
                    engineRef.current?.setKeyboardFocus(i);
                    engineRef.current?.reveal(i);
                  }}
                  onBlur={() => engineRef.current?.setKeyboardFocus(null)}
                  onClick={() => toggleFocus(i)}
                >
                  {a11yLabel(node)}
                </button>
              </li>
            ) : null,
          )}
        </ul>

        {last < 0 && (
          <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-xs text-slate-300">
            Nenhuma publicação nesta subcomunidade ainda.
          </p>
        )}

        <Legend />

        {focus !== null && timeline.nodes[focus] && (
          <FocusCard
            node={timeline.nodes[focus]}
            timeline={timeline}
            index={focus}
            compact={compact}
            pinned={pins.has(timeline.nodes[focus].id)}
            onTogglePin={focus > 0 ? () => engineRef.current?.togglePin(focus) : undefined}
            onOpenPost={onOpenPost}
            onClear={() => setFocus(null)}
          />
        )}

        <div
          data-graph-control
          className={`lg-bar absolute right-2.5 z-20 flex items-center gap-1 rounded-full p-1 ${compact ? "bottom-2.5" : "top-2.5"}`}
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
            className="rounded-full px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
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
            onAnimate={restart}
            pinnedCount={timeline.nodes.filter((n) => pins.has(n.id)).length}
            onUnpinAll={() => engineRef.current?.unpinAll()}
            search={search}
            onSearch={setSearch}
            toggles={[{ id: "tags", label: "Tags", checked: showTags, onToggle: () => setShowTags((v) => !v) }]}
            compact={compact}
            compactBottom="bottom-[60px]"
            onClose={() => setSettingsOpen(false)}
          />
        )}
      </div>

      <div
        className={`shrink-0 border-t border-white/[0.12] bg-tinta ${compact ? "px-3.5 pt-2.5 pb-24" : "px-6 py-3"}`}
      >
        <div className="flex items-baseline justify-between gap-3">
          <p
            role="status"
            aria-live={playing ? "off" : "polite"}
            className="line-clamp-2 min-h-[2lh] text-xs leading-snug text-white"
          >
            {current ? (
              <>
                <strong className="font-bold text-areia">{formatHoursAgo(current.hoursAgo)}</strong> · {current.caption}
              </>
            ) : (
              <span className="text-slate-300">Aperte ▶ para ver a comunidade crescer.</span>
            )}
          </p>
          <span className="shrink-0 text-[10px] whitespace-nowrap text-slate-300">
            {counts.posts} posts · {counts.comments} comentários{showTags ? ` · ${counts.tags} tags` : ""}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={restart}
            aria-label="Recomeçar"
            title="Recomeçar"
            className="lg-pill flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm text-white"
          >
            ⏮
          </button>
          <button
            type="button"
            onClick={togglePlay}
            disabled={last < 0}
            aria-label={playing ? "Pausar" : step >= last ? "Repetir animação" : "Reproduzir"}
            className="lg-btn-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold disabled:opacity-40"
          >
            {playing ? "⏸" : step >= last ? "↻" : "▶"}
          </button>
          <label className="sr-only" htmlFor={`${titleId}-scrub`}>
            Momento da linha do tempo
          </label>
          <input
            id={`${titleId}-scrub`}
            type="range"
            min={-1}
            max={Math.max(0, last)}
            step={1}
            value={step}
            onChange={(e) => {
              setPlaying(false);
              setStep(Number(e.target.value));
            }}
            aria-valuetext={current ? `${formatHoursAgo(current.hoursAgo)}: ${current.caption}` : "Início"}
            className="min-w-0 flex-1 accent-areia"
          />
          <button
            type="button"
            onClick={() => setSpeed((s) => SPEEDS[(SPEEDS.indexOf(s) + 1) % SPEEDS.length])}
            aria-label={`Velocidade ${speed}x`}
            className="lg-pill h-9 shrink-0 rounded-full px-3 text-xs font-bold text-white"
          >
            {speed}×
          </button>
        </div>
      </div>
    </div>
  );
}

function a11yLabel(node: TimelineNode): string {
  switch (node.kind) {
    case "post":
      return `Post de ${node.author}: ${node.title}, ${formatHoursAgo(node.hoursAgo)}`;
    case "comment":
      return `Comentário de ${node.author}, ${formatHoursAgo(node.hoursAgo)}: ${node.text}`;
    case "reply":
      return `Resposta de ${node.author}, ${formatHoursAgo(node.hoursAgo)}: ${node.text}`;
    case "tag":
      return `Tag ${node.tag}, ${node.uses} ${node.uses === 1 ? "ligação" : "ligações"}`;
  }
}

function Legend() {
  return (
    <ul
      data-graph-control
      aria-label="Legenda"
      className="lg-bar absolute top-2.5 left-2.5 z-20 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl px-3 py-1.5 text-[10px] text-slate-200"
    >
      <li className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full border-2 border-amber-300 bg-noite" aria-hidden="true" />
        Post
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-0.5 w-3.5 rounded bg-marfim/70" aria-hidden="true" />
        Comentário
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-0 w-3.5 border-t-2 border-dashed border-violet-300" aria-hidden="true" />
        Resposta
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-areia" aria-hidden="true" />
        Tag
      </li>
    </ul>
  );
}

function FocusCard({
  node,
  timeline,
  index,
  compact,
  pinned,
  onTogglePin,
  onOpenPost,
  onClear,
}: {
  node: TimelineNode;
  timeline: CommunityTimeline;
  index: number;
  compact: boolean;
  pinned: boolean;
  onTogglePin?: () => void;
  onOpenPost: (id: string) => void;
  onClear: () => void;
}) {
  const title = node.kind === "tag" ? `#${node.tag}` : node.kind === "post" ? node.title : node.author;
  const detail =
    node.kind === "tag"
      ? `Aparece em ${node.uses} ${node.uses === 1 ? "publicação" : "publicações"}: ${timeline.incident[index]
          .map((e) => nodeLabel(timeline.nodes[timeline.edges[e].source]))
          .join(", ")}`
      : node.kind === "post"
        ? `${node.author} · ${formatHoursAgo(node.hoursAgo)}`
        : `“${node.text}” · ${formatHoursAgo(node.hoursAgo)}`;
  return (
    <div
      data-graph-control
      className={`lg-bar absolute z-20 flex items-center gap-2 rounded-2xl px-3 py-2 ${compact ? "top-12 right-2.5 left-2.5" : "bottom-4 left-4 max-w-[60%]"}`}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-bold text-white">{title}</div>
        <div className="line-clamp-2 text-[11px] leading-snug text-slate-300">{detail}</div>
      </div>
      {onTogglePin && <PinButton pinned={pinned} onToggle={onTogglePin} />}
      {node.kind !== "tag" && (
        <button
          type="button"
          onClick={() => onOpenPost(node.postId)}
          className="lg-btn-primary shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold"
        >
          Abrir post
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
