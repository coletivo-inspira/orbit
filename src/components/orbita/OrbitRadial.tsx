"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { MolduraDoUsuario } from "@/components/molduras/MolduraAvatar";
import { ConversationBalloon } from "@/components/orbita/ConversationBalloon";
import { RadarMapBackdrop } from "@/components/orbita/RadarMapBackdrop";
import { Avatar, ProfileImage } from "@/components/ui/Avatar";
import { hasTalked } from "@/lib/conversas";
import { INTENTIONS } from "@/lib/data/intentions";
import { prefersReducedMotion } from "@/lib/a11y/motion";
import {
  cullIndices,
  frontierFor,
  hexRingPositions,
  maxPanFor,
  OrbitHoneycombEngine,
  type OrbitNode,
  type OrbitView,
} from "@/lib/engines/orbitHoneycomb";
import { useDevice } from "@/lib/state/device";
import { useOrbit } from "@/lib/state/OrbitProvider";
import type { Profile } from "@/lib/types";

interface OrbitRadialProps {
  profiles: Profile[];
  isWatch?: boolean;
  centerOffsetY?: number;
  onCenterClick: () => void;
  /** Shared-topic count per profile id, shown as a badge on each bubble. */
  affinity?: ReadonlyMap<string, number>;
  /** Rendered inside the drag field (e.g. the recenter button, which reads `useOrbitRecenter`). */
  overlay?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const RecenterContext = createContext<() => void>(() => {});

export function useOrbitRecenter() {
  return useContext(RecenterContext);
}

/** Apple Watch–style honeycomb: user fixed at the center, nearby profiles orbiting with fisheye scaling. */
export function OrbitRadial({
  profiles,
  isWatch = false,
  centerOffsetY = 0,
  onCenterClick,
  affinity,
  overlay,
  className = "",
  style,
}: OrbitRadialProps) {
  const { state, dispatch } = useOrbit();
  const { getScale } = useDevice();
  const fieldRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLButtonElement>(null);
  const bubbleRefs = useRef<(HTMLDivElement | null)[]>([]);
  const engineRef = useRef<OrbitHoneycombEngine | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const frontierRef = useRef<HTMLDivElement>(null);

  const crowded = profiles.length > 24;
  const baseRadius = isWatch ? 24 : crowded ? 32 : 36;
  const spacing = isWatch ? 64 : crowded ? 94 : 104;
  const positions = useMemo(() => hexRingPositions(profiles.length, spacing), [profiles.length, spacing]);
  const maxPan = maxPanFor(positions, isWatch);
  const frontier = isWatch ? null : frontierFor(positions, spacing);
  const profileKey = profiles.map((p) => p.id).join(",");

  // Only bubbles near the visible field are mounted; the engine reports when the view moves to another cell.
  const [view, setView] = useState<OrbitView>({ x: 0, y: 0, radius: 900 });
  const visible = useMemo(() => cullIndices(positions, view.x, view.y, view.radius), [positions, view]);
  const visibleRef = useRef(visible);
  const collectNodes = useCallback(
    (): OrbitNode[] =>
      visibleRef.current.flatMap((i) => {
        const el = bubbleRefs.current[i];
        return el && positions[i]
          ? [
              {
                el,
                labelEl: el.querySelector<HTMLElement>("[data-label]"),
                bx: positions[i].x,
                by: positions[i].y,
                index: i,
              },
            ]
          : [];
      }),
    [positions],
  );

  useEffect(() => {
    const field = fieldRef.current;
    const center = centerRef.current;
    if (!field || !center) return;
    const engine = new OrbitHoneycombEngine({
      container: field,
      centerEl: center,
      isWatch,
      maxPan,
      centerOffsetY,
      getScale,
      reducedMotion: prefersReducedMotion,
      backdropEl: backdropRef.current,
      frontier,
      frontierEl: frontierRef.current,
      onViewChange: setView,
      nodes: collectNodes(),
    });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [profileKey, positions, maxPan, frontier, isWatch, centerOffsetY, getScale, collectNodes]);

  useLayoutEffect(() => {
    visibleRef.current = visible;
    engineRef.current?.setNodes(collectNodes());
  }, [visible, collectNodes]);

  const centerSize = baseRadius * 2.15;
  const diameter = baseRadius * 2;
  const ignoreIfDragged = () => engineRef.current?.wasDragged() ?? false;
  const recenter = useCallback(() => engineRef.current?.recenter(), []);

  return (
    <div
      ref={fieldRef}
      className={`relative cursor-grab touch-none overflow-hidden select-none active:cursor-grabbing ${className}`}
      style={style}
    >
      {!isWatch && <RadarMapBackdrop ref={backdropRef} />}
      {!isWatch && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-30">
          <div className="h-[210px] w-[210px] rounded-full border border-white/25" />
          <div className="absolute h-[390px] w-[390px] rounded-full border border-dashed border-areia/25" />
          <div className="absolute h-[580px] w-[580px] rounded-full border border-white/10" />
          {crowded && (
            <div className="absolute h-[780px] w-[780px] rounded-full border border-dashed border-white/[0.08]" />
          )}
        </div>
      )}

      <div className="absolute inset-0">
        {frontier && (
          <div
            ref={frontierRef}
            className="pointer-events-none absolute top-1/2 left-1/2 rounded-full border-2 border-dashed border-areia/35"
            style={{ width: frontier * 2, height: frontier * 2, transform: "translate(-50%, -50%)" }}
            aria-hidden="true"
          />
        )}
        <button
          ref={centerRef}
          type="button"
          onClick={() => !ignoreIfDragged() && onCenterClick()}
          onFocus={(e) => e.currentTarget.matches(":focus-visible") && recenter()}
          className="absolute top-1/2 left-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 cursor-pointer flex-col items-center rounded-full"
        >
          <div className="relative flex flex-col items-center">
            <MolduraDoUsuario size={centerSize} sombra="0 12px 28px rgba(0,0,0,0.55)">
              <Avatar cfg={state.user.avatar} />
            </MolduraDoUsuario>
            <span className="absolute -bottom-2.5 rounded-full border border-white/30 bg-noite px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
              Você<span className="sr-only">, abrir meu perfil</span>
            </span>
          </div>
        </button>

        {visible.map((idx) => {
          const p = profiles[idx];
          const intention = INTENTIONS[p.primaryIntention];
          const shared = affinity?.get(p.id) ?? 0;
          const conversation = state.conversations[p.id];
          const revealOnKeyboard = (e: React.FocusEvent<HTMLElement>) =>
            e.currentTarget.matches(":focus-visible") && engineRef.current?.reveal(idx);
          return (
            <div
              key={p.id}
              ref={(el) => {
                bubbleRefs.current[idx] = el;
              }}
              className="absolute top-0 left-0 opacity-0 will-change-transform"
            >
              <button
                type="button"
                onFocus={revealOnKeyboard}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!ignoreIfDragged()) dispatch({ type: "openProfile", id: p.id });
                }}
                className="flex cursor-pointer flex-col items-center rounded-2xl"
              >
                <div className="relative" data-avatar aria-hidden="true">
                  <div
                    className="overflow-hidden rounded-full"
                    style={{
                      width: diameter,
                      height: diameter,
                      boxShadow: `0 0 0 2.5px ${intention.color}, 0 0 0 ${isWatch ? 4 : 5}px rgba(255,255,255,0.12), 0 10px 22px rgba(0,0,0,0.45)`,
                    }}
                  >
                    <ProfileImage cfg={p.avatar} photo={p.photo} />
                  </div>
                  {shared > 0 && !isWatch && (
                    <span className="absolute -top-1 -left-1 flex h-5 min-w-5 items-center justify-center rounded-full border border-tinta bg-areia px-1 text-[10px] font-extrabold text-tinta shadow">
                      {shared}
                    </span>
                  )}
                  {p.online && (
                    <span
                      className={`absolute right-0.5 bottom-0.5 ${isWatch ? "h-2.5 w-2.5" : "h-3 w-3"} rounded-full border-2 border-tinta bg-emerald-400`}
                    />
                  )}
                  {p.visitingFrom && !isWatch && (
                    <span
                      title={`De passagem, mora em ${p.visitingFrom}`}
                      className="absolute -bottom-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full border border-white/40 bg-noite text-[10px] shadow"
                    >
                      ✈️
                    </span>
                  )}
                  {p.inPark && !isWatch && (
                    <span
                      title="Está no Parque 2D"
                      className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-white/40 bg-salvia text-[10px] shadow"
                    >
                      🌳
                    </span>
                  )}
                </div>
                <div
                  data-label
                  className={`mt-1.5 rounded-full border border-white/20 bg-tinta/90 px-2 py-0.5 ${isWatch ? "text-[9px]" : "text-[10px]"} font-bold whitespace-nowrap text-white`}
                >
                  {p.name} <span className="font-normal text-slate-300">{p.dist}</span>
                </div>
                <span className="sr-only">
                  , {intention.label}
                  {shared > 0 ? `, ${shared} ${shared === 1 ? "assunto" : "assuntos"} em comum` : ""}
                  {p.online ? ", online" : ""}
                  {p.visitingFrom ? `, de passagem, mora em ${p.visitingFrom}` : ""}
                  {p.inPark ? ", no Parque" : ""}. Ver perfil
                </span>
              </button>
              {hasTalked(conversation) && !isWatch && (
                <ConversationBalloon
                  name={p.name}
                  conversation={conversation}
                  onFocus={revealOnKeyboard}
                  onOpen={(origin) => !ignoreIfDragged() && dispatch({ type: "openMiniChat", id: p.id, origin })}
                  style={{ left: diameter * 0.62, top: -24 }}
                />
              )}
            </div>
          );
        })}
      </div>

      <RecenterContext value={recenter}>{overlay}</RecenterContext>
    </div>
  );
}
