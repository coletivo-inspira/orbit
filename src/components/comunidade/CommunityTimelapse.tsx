"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { GraphSettingsPanel } from "@/components/graph/GraphSettingsPanel";
import { useGraphDisplay } from "@/components/graph/useGraphDisplay";
import { Avatar, ProfileImage } from "@/components/ui/Avatar";
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
import { GraphViewEngine, type EdgeStyle, type GraphViewState } from "@/lib/engines/graphView";
import { normalizeSearch } from "@/lib/keywords";
import { useDevice } from "@/lib/state/device";
import { useOrbit } from "@/lib/state/OrbitProvider";
import type { CommunityCategory, CommunityPost } from "@/lib/types";
import { CloseButton } from "@/components/ui/Button";

const STEP_MS = 900;
const SPEEDS = [1, 2, 4] as const;
const DISPLAY_KEY = "orbit:graph:linha-do-tempo:v1";

const CATEGORY_COLOR: Record<CommunityCategory, string> = {
  vacinas: "#d9e4d6",
  prevencao: "#9fc1a8",
  bemestar: "#f2b8b5",
  debates: "#e2b293",
};

const EDGE_STYLES: Record<TimelineEdge["kind"], EdgeStyle> = {
  comentario: { color: "rgb(245 240 231)", alpha: 0.5, dash: [] },
  resposta: { color: "#f2b8b5", alpha: 0.7, dash: [4, 3] },
  tag: { color: "#dec9a8", alpha: 0.32, dash: [] },
};
const styleOf = (e: TimelineEdge) => e.kind;

const RADIUS: Record<TimelineNode["kind"], number> = { post: 18, comment: 14, reply: 12, tag: 6 };

function charge(node: TimelineNode): number {
  if (node.kind === "post") return -320;
  if (node.kind === "tag") return -90 - Math.min(node.uses, 8) * 12;
  return node.kind === "comment" ? -170 : -140;
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
  const worldRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const engineRef = useRef<GraphViewEngine<TimelineEdge> | null>(null);
  const positionsRef = useRef<Map<string, { x: number; y: number }> | null>(null);
  const viewRef = useRef<GraphViewState | null>(null);
  const latest = useRef({ display, step });
  useLayoutEffect(() => {
    latest.current = { display, step };
  });

  // A rebuilt timeline (tags on/off, new comment) invalidates the focused index.
  const [timelineForFocus, setTimelineForFocus] = useState(timeline);
  if (timelineForFocus !== timeline) {
    setTimelineForFocus(timeline);
    setFocus(null);
  }

  useEffect(() => {
    const container = containerRef.current;
    const world = worldRef.current;
    const canvas = canvasRef.current;
    if (!container || !world || !canvas) return;
    const { display: d, step: s } = latest.current;
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
      world,
      canvas,
      nodeEls: nodeRefs.current.slice(0, timeline.nodes.length),
      edges: timeline.edges,
      edgeStyles: EDGE_STYLES,
      styleOf,
      layout,
      getScale,
      reducedMotion: prefersReducedMotion,
      centerOffsetY: 0,
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
  }, [timeline, getScale]);

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

  const lit = useMemo(() => {
    if (focus === null) return null;
    const nodes = new Set([focus]);
    const direct = new Set(timeline.incident[focus]);
    direct.forEach((e) => {
      nodes.add(timeline.edges[e].source);
      nodes.add(timeline.edges[e].target);
    });
    return { nodes, direct };
  }, [timeline, focus]);
  const matches = useMemo(() => {
    const q = normalizeSearch(search);
    if (!q) return null;
    const out = new Set<number>();
    timeline.nodes.forEach((n, i) => normalizeSearch(searchText(n)).includes(q) && out.add(i));
    return out;
  }, [timeline, search]);
  useEffect(() => {
    const direct = lit?.direct ?? (matches ? new Set([...matches].flatMap((i) => timeline.incident[i])) : null);
    engineRef.current?.setHighlight(direct ? { direct, shared: new Set(), color: "#dec9a8" } : null);
  }, [lit, matches, timeline]);

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
  const ignoreIfDragged = () => engineRef.current?.wasDragged() ?? false;
  const current = step >= 0 ? timeline.steps[step] : null;
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
          <p className="mt-0.5 text-xs leading-snug text-marfim-suave">
            Posts, comentários e respostas aparecem na ordem em que aconteceram, ligados às tags de cada um.
          </p>
        </div>
        <CloseButton onClose={onClose} label="Fechar linha do tempo" size="compacto" />
      </div>

      <div
        ref={containerRef}
        className="group/graph relative min-h-0 flex-1 cursor-grab touch-none overflow-hidden select-none active:cursor-grabbing"
        style={{
          background: "radial-gradient(circle at center, #2a3644 0%, rgb(28 38 49 / 0) 75%)",
          ["--node-scale" as string]: display.nodeSize,
        }}
      >
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />
        <div ref={worldRef} className="absolute top-0 left-0 origin-top-left will-change-transform">
          {timeline.nodes.map((node, i) => {
            const active = timeline.stepOf[i] <= step;
            const dim = (lit && !lit.nodes.has(i)) || (!lit && matches && !matches.has(i));
            const emphasized = Boolean(lit?.nodes.has(i) || matches?.has(i));
            const fresh = current?.nodes.includes(i) ?? false;
            return (
              <div
                key={node.id}
                ref={(el) => {
                  nodeRefs.current[i] = el;
                }}
                data-node-index={i}
                data-active={active}
                className="absolute top-0 left-0 will-change-transform data-[active=false]:invisible"
                style={{ opacity: dim ? 0.2 : 1, zIndex: focus === i ? 3 : node.kind === "tag" ? 1 : 2 }}
              >
                <button
                  type="button"
                  tabIndex={active ? 0 : -1}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!ignoreIfDragged()) setFocus(focus === i ? null : i);
                  }}
                  className="timelapse-pop relative block origin-center cursor-pointer rounded-full"
                  style={{ transform: "scale(var(--node-scale, 1))" }}
                >
                  <TimelineDot node={node} selected={focus === i} fresh={fresh} userAvatar={state.user.avatar} />
                  <span
                    className={`pointer-events-none absolute top-full left-1/2 mt-1 -translate-x-1/2 whitespace-nowrap ${
                      emphasized || fresh || node.kind === "post" ? "" : "group-data-[zoom=far]/graph:hidden"
                    } ${
                      node.kind === "tag"
                        ? "text-xs font-semibold text-areia"
                        : node.kind === "post"
                          ? "rounded-full border border-white/20 bg-tinta/90 px-1.5 py-px text-xs font-bold text-white"
                          : "text-xs font-semibold text-marfim-suave"
                    }`}
                    aria-hidden="true"
                  >
                    {nodeLabel(node)}
                  </span>
                  <span className="sr-only">{a11yLabel(node)}</span>
                </button>
              </div>
            );
          })}
        </div>

        {last < 0 && (
          <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-xs text-marfim-suave">
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
            className="rounded-full px-2.5 min-h-9 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
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
            onAnimate={restart}
            search={search}
            onSearch={setSearch}
            toggles={[{ id: "tags", label: "Tags", checked: showTags, onToggle: () => setShowTags((v) => !v) }]}
            compact={compact}
            compactBottom="bottom-[60px]"
            onClose={() => setSettingsOpen(false)}
          />
        )}
      </div>

      <div className={`lg-glass lg-glass-footer shrink-0 ${compact ? "px-3.5 pt-2.5 pb-24" : "px-6 py-3"}`}>
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
              <span className="text-marfim-suave">Aperte ▶ para ver a comunidade crescer.</span>
            )}
          </p>
          <span className="shrink-0 text-xs whitespace-nowrap text-marfim-suave">
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

function TimelineDot({
  node,
  selected,
  fresh,
  userAvatar,
}: {
  node: TimelineNode;
  selected: boolean;
  fresh: boolean;
  userAvatar: Parameters<typeof Avatar>[0]["cfg"];
}) {
  const glow = selected ? ", 0 0 0 6px rgb(222 201 168 / 45%)" : fresh ? ", 0 0 0 5px rgb(222 201 168 / 30%)" : "";
  if (node.kind === "tag") {
    return (
      <span
        className="block h-3 w-3 rounded-full bg-areia"
        style={{ boxShadow: `0 0 0 2px rgb(28 38 49 / 70%)${glow}` }}
        aria-hidden="true"
      />
    );
  }
  if (node.kind === "post") {
    const color = CATEGORY_COLOR[node.category];
    return (
      <span
        className="flex h-9 w-9 items-center justify-center rounded-full bg-noite text-base"
        style={{ boxShadow: `0 0 0 3px ${color}, 0 8px 18px rgba(0,0,0,0.45)${glow}` }}
        aria-hidden="true"
      >
        {COMMUNITY_CATEGORIES[node.category].label.split(" ")[0]}
      </span>
    );
  }
  const size = node.kind === "comment" ? "h-7 w-7" : "h-6 w-6";
  const profile = node.profileId && node.profileId !== "me" ? profileById(node.profileId) : undefined;
  return (
    <span
      className={`flex ${size} items-center justify-center overflow-hidden rounded-full bg-noite-elevada text-xs font-extrabold text-white`}
      style={{
        boxShadow: `0 0 0 2px ${node.kind === "reply" ? "#f2b8b5" : "rgb(245 240 231 / 80%)"}, 0 6px 12px rgba(0,0,0,0.4)${glow}`,
      }}
      aria-hidden="true"
    >
      {node.profileId === "me" || node.local ? (
        <Avatar cfg={userAvatar} />
      ) : profile ? (
        <ProfileImage cfg={profile.avatar} photo={profile.photo} />
      ) : (
        node.author.charAt(0)
      )}
    </span>
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
      className="lg-bar absolute top-2.5 left-2.5 z-20 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-cartao px-3 py-1.5 text-xs text-marfim-suave"
    >
      <li className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full border-2 border-areia bg-noite" aria-hidden="true" />
        Post
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-0.5 w-3.5 rounded bg-marfim/70" aria-hidden="true" />
        Comentário
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-0 w-3.5 border-t-2 border-dashed border-alerta" aria-hidden="true" />
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
  onOpenPost,
  onClear,
}: {
  node: TimelineNode;
  timeline: CommunityTimeline;
  index: number;
  compact: boolean;
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
      className={`lg-bar absolute z-20 flex items-center gap-2 rounded-cartao px-3 py-2 ${compact ? "top-12 right-2.5 left-2.5" : "bottom-4 left-4 max-w-[60%]"}`}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-bold text-white">{title}</div>
        <div className="line-clamp-2 text-xs leading-snug text-marfim-suave">{detail}</div>
      </div>
      {node.kind !== "tag" && (
        <button
          type="button"
          onClick={() => onOpenPost(node.postId)}
          className="lg-btn-primary shrink-0 rounded-full px-3 min-h-9 py-1.5 text-xs font-bold"
        >
          Abrir post
        </button>
      )}
      <CloseButton onClose={onClear} label="Limpar destaque" size="compacto" />
    </div>
  );
}
