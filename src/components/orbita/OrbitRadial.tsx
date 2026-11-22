"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { INTENTIONS } from "@/lib/data/intentions";
import { hexRingPositions, OrbitHoneycombEngine } from "@/lib/engines/orbitHoneycomb";
import { useDevice } from "@/lib/state/device";
import { useOrbit } from "@/lib/state/OrbitProvider";
import type { Profile } from "@/lib/types";

interface OrbitRadialProps {
  profiles: Profile[];
  isWatch?: boolean;
  centerOffsetY?: number;
  onCenterClick: () => void;
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
  overlay,
  className = "",
  style,
}: OrbitRadialProps) {
  const { state, dispatch } = useOrbit();
  const { getScale } = useDevice();
  const fieldRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLButtonElement>(null);
  const bubbleRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const engineRef = useRef<OrbitHoneycombEngine | null>(null);

  const baseRadius = isWatch ? 24 : 36;
  const positions = useMemo(() => hexRingPositions(profiles.length, isWatch ? 64 : 104), [profiles.length, isWatch]);
  const profileKey = profiles.map((p) => p.id).join(",");

  useEffect(() => {
    const field = fieldRef.current;
    const center = centerRef.current;
    if (!field || !center) return;
    const engine = new OrbitHoneycombEngine({
      container: field,
      centerEl: center,
      isWatch,
      centerOffsetY,
      getScale,
      nodes: bubbleRefs.current
        .slice(0, positions.length)
        .flatMap((el, i) =>
          el
            ? [{ el, labelEl: el.querySelector<HTMLElement>("[data-label]"), bx: positions[i].x, by: positions[i].y }]
            : [],
        ),
    });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [profileKey, positions, isWatch, centerOffsetY, getScale]);

  const userIntention = INTENTIONS[state.user.primaryIntention];
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
      {!isWatch && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-30">
          <div className="h-[210px] w-[210px] rounded-full border border-white/25" />
          <div className="absolute h-[390px] w-[390px] rounded-full border border-dashed border-cyan-200/25" />
          <div className="absolute h-[580px] w-[580px] rounded-full border border-white/10" />
        </div>
      )}

      <div className="absolute inset-0">
        <button
          ref={centerRef}
          type="button"
          aria-label="Abrir meu perfil"
          onClick={() => !ignoreIfDragged() && onCenterClick()}
          className="absolute top-1/2 left-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 cursor-pointer flex-col items-center focus:outline-none"
        >
          <div className="relative flex flex-col items-center">
            <div
              className="overflow-hidden rounded-full shadow-2xl"
              style={{
                width: centerSize,
                height: centerSize,
                boxShadow: `0 0 0 3px ${userIntention.color}, 0 0 0 6px rgba(255,255,255,0.14), 0 12px 28px rgba(0,0,0,0.55)`,
              }}
            >
              <Avatar cfg={state.user.avatar} />
            </div>
            <span className="absolute -bottom-2.5 rounded-full border border-white/30 bg-slate-900/75 px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow-[0_4px_12px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-xl">
              Você
            </span>
          </div>
        </button>

        {profiles.map((p, idx) => {
          const intention = INTENTIONS[p.primaryIntention];
          return (
            <button
              key={p.id}
              ref={(el) => {
                bubbleRefs.current[idx] = el;
              }}
              type="button"
              aria-label={`Ver perfil de ${p.name}`}
              onClick={(e) => {
                e.stopPropagation();
                if (!ignoreIfDragged()) dispatch({ type: "openProfile", id: p.id });
              }}
              className="absolute top-0 left-0 flex cursor-pointer flex-col items-center opacity-0 will-change-transform focus:outline-none"
            >
              <div className="relative">
                <div
                  className="overflow-hidden rounded-full"
                  style={{
                    width: diameter,
                    height: diameter,
                    boxShadow: `0 0 0 2.5px ${intention.color}, 0 0 0 ${isWatch ? 4 : 5}px rgba(255,255,255,0.12), 0 10px 22px rgba(0,0,0,0.45)`,
                  }}
                >
                  <Avatar cfg={p.avatar} />
                </div>
                {p.online && (
                  <span
                    className={`absolute right-0.5 bottom-0.5 ${isWatch ? "h-2.5 w-2.5" : "h-3 w-3"} rounded-full border-2 border-slate-950 bg-emerald-400`}
                  />
                )}
                {p.inPark && !isWatch && (
                  <span
                    title="Está no Parque 2D"
                    className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-white/40 bg-emerald-400/90 text-[10px] shadow backdrop-blur-md"
                  >
                    🌳
                  </span>
                )}
              </div>
              <div
                data-label
                className={`mt-1.5 rounded-full border border-white/20 bg-slate-950/65 px-2 py-0.5 ${isWatch ? "text-[9px]" : "text-[10px]"} font-bold whitespace-nowrap text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-xl`}
              >
                {p.name} <span className="font-normal text-slate-300/80">{p.dist}</span>
              </div>
            </button>
          );
        })}
      </div>

      <RecenterContext value={recenter}>{overlay}</RecenterContext>
    </div>
  );
}
