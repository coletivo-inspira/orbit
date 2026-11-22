"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type WheelEvent,
} from "react";
import { prefersReducedMotion } from "@/lib/a11y/motion";
import {
  cardPose,
  clampIndex,
  releaseTarget,
  rubberBand,
  springSettled,
  springStep,
  visibleRange,
  type SpringState,
} from "@/lib/deck";

const DRAG_SLOP = 6;
const WHEEL_STEP = 60;

interface CardDeckProps<T> {
  items: readonly T[];
  getKey: (item: T) => string;
  /** Accessible name of the deck, e.g. "Quem abriu seu perfil". */
  label: string;
  /** Short spoken name of an item, e.g. "Camila, 26". */
  itemLabel: (item: T) => string;
  /** Card face, clipped to the card shape; not interactive. `front` is true for the card on top. */
  renderCard: (item: T, state: { front: boolean }) => ReactNode;
  /** Extra controls layered over the front card (e.g. a tap-back button). */
  renderActions?: (item: T) => ReactNode;
  /** Details of the front card, shown under the pile between the arrows. */
  renderCaption?: (item: T) => ReactNode;
  /** Tapping the front card. */
  onOpen: (item: T) => void;
  /** Verb for the front card's accessible name: `${openLabel} ${itemLabel}`. */
  openLabel?: string;
  /** Arrows, caption and counter under the pile; off for a compact embedded pile. */
  controls?: boolean;
  /** Tighter caption row for tiny screens such as the watch; the arrows keep their 44 px targets. */
  compact?: boolean;
  /** Sizes the pile area (the card is a square as tall as it); defaults to a medium pile. */
  stageClassName?: string;
  className?: string;
}

/**
 * Loosely shuffled photo pile: the front card can be tapped, swiped or dragged away along an orbit and
 * brought back. Only the leaving, front and few peeking cards are mounted, so it scales to any list.
 */
export function CardDeck<T>({
  items,
  getKey,
  label,
  itemLabel,
  renderCard,
  renderActions,
  renderCaption,
  onOpen,
  openLabel = "Abrir perfil de",
  controls = true,
  compact = false,
  stageClassName = "h-[240px]",
  className = "",
}: CardDeckProps<T>) {
  const count = items.length;
  const [position, setPosition] = useState(0);
  const index = clampIndex(Math.round(position), count);

  const spring = useRef<SpringState>({ position: 0, velocity: 0 });
  const target = useRef(0);
  const frame = useRef<number | null>(null);
  const lastTime = useRef(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLButtonElement>(null);
  const refocus = useRef(false);
  const suppressClick = useRef(false);
  const wheelAcc = useRef(0);
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    from: number;
    active: boolean;
    samples: { t: number; p: number }[];
  } | null>(null);

  const stop = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  const place = useCallback((p: number) => {
    spring.current = { ...spring.current, position: p };
    setPosition(p);
  }, []);

  const settleTo = useCallback(
    (next: number, velocity = spring.current.velocity) => {
      target.current = next;
      if (prefersReducedMotion()) {
        stop();
        spring.current = { position: next, velocity: 0 };
        setPosition(next);
        return;
      }
      spring.current = { ...spring.current, velocity };
      if (frame.current !== null) return;
      lastTime.current = performance.now();
      const tick = (now: number) => {
        const dt = (now - lastTime.current) / 1000;
        lastTime.current = now;
        let s = springStep(spring.current, target.current, dt);
        if (springSettled(s, target.current)) s = { position: target.current, velocity: 0 };
        spring.current = s;
        setPosition(s.position);
        frame.current = s.velocity === 0 && s.position === target.current ? null : requestAnimationFrame(tick);
      };
      frame.current = requestAnimationFrame(tick);
    },
    [stop],
  );

  const go = useCallback((next: number) => settleTo(clampIndex(next, count)), [count, settleTo]);

  useEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    frontRef.current?.focus({ preventScroll: true });
  }, [index]);

  if (count === 0) return null;

  const cardWidth = () => boxRef.current?.getBoundingClientRect().width || 240;

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    stop();
    drag.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      from: spring.current.position,
      active: false,
      samples: [{ t: e.timeStamp, p: spring.current.position }],
    };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.active) {
      if (Math.abs(dy) > DRAG_SLOP && Math.abs(dy) > Math.abs(dx)) {
        drag.current = null;
        settleTo(clampIndex(Math.round(spring.current.position), count));
        return;
      }
      if (Math.abs(dx) < DRAG_SLOP) return;
      d.active = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const p = rubberBand(d.from - dx / (cardWidth() * 0.85), count);
    d.samples.push({ t: e.timeStamp, p });
    if (d.samples.length > 6) d.samples.shift();
    place(p);
  };

  const endDrag = (e: PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (!d.active) {
      settleTo(clampIndex(Math.round(spring.current.position), count), 0);
      return;
    }
    suppressClick.current = true;
    setTimeout(() => (suppressClick.current = false), 0);
    const first = d.samples[0];
    const last = d.samples[d.samples.length - 1];
    const span = (last.t - first.t) / 1000;
    const velocity = span > 0 && e.timeStamp - last.t < 80 ? (last.p - first.p) / span : 0;
    settleTo(
      cancelled ? clampIndex(Math.round(last.p), count) : releaseTarget(last.p, velocity, count, d.from),
      velocity,
    );
  };

  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    wheelAcc.current += e.deltaX;
    if (Math.abs(wheelAcc.current) < WHEEL_STEP) return;
    const step = Math.sign(wheelAcc.current);
    wheelAcc.current = 0;
    go(target.current + step);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowDown: index + 1,
      PageDown: index + 1,
      ArrowLeft: index - 1,
      ArrowUp: index - 1,
      PageUp: index - 1,
      Home: 0,
      End: count - 1,
    };
    if (!(e.key in keys) || (e.target as HTMLElement).closest("[data-deck-controls]")) return;
    e.preventDefault();
    refocus.current = true;
    go(keys[e.key]);
  };

  const [first, last] = visibleRange(position, count);
  const front = items[index];
  const cards: ReactNode[] = [];
  for (let i = first; i <= last; i++) {
    const item = items[i];
    const pose = cardPose(i, position);
    const isFront = i === index;
    cards.push(
      <div
        key={getKey(item)}
        inert={!isFront}
        aria-hidden={!isFront || undefined}
        className="absolute inset-0 will-change-transform"
        style={{
          transform: `translate3d(${pose.x}%, ${pose.y}%, 0) rotate(${pose.rotate}deg) scale(${pose.scale})`,
          opacity: pose.opacity,
          zIndex: pose.zIndex,
        }}
      >
        <button
          ref={isFront ? frontRef : undefined}
          type="button"
          onClick={() => onOpen(item)}
          aria-label={`${openLabel} ${itemLabel(item)}`}
          className="absolute inset-0 overflow-hidden rounded-[26%] border border-white/[0.14] bg-noite shadow-[0_22px_44px_-18px_rgba(0,0,0,0.75)]"
        >
          {renderCard(item, { front: isFront })}
          <span
            className="pointer-events-none absolute inset-0 bg-tinta"
            style={{ opacity: pose.shade }}
            aria-hidden="true"
          />
        </button>
        {isFront && renderActions?.(item)}
      </div>,
    );
  }

  const progress = count > 1 ? index / (count - 1) : 0;

  return (
    <div
      role="group"
      aria-roledescription="pilha de cartões"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={`flex flex-col items-center ${className}`}
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => endDrag(e, false)}
        onPointerCancel={(e) => endDrag(e, true)}
        onClickCapture={(e) => {
          if (!suppressClick.current) return;
          e.preventDefault();
          e.stopPropagation();
        }}
        onWheel={onWheel}
        className={`relative flex w-full touch-pan-y items-center justify-center select-none ${stageClassName}`}
      >
        <div ref={boxRef} className="relative isolate aspect-square h-[88%] max-w-[88%]">
          <div
            className="pointer-events-none absolute -inset-[13%] rounded-full border border-dashed border-white/[0.13]"
            aria-hidden="true"
          >
            <div
              className="absolute inset-0 transition-transform duration-500"
              style={{ rotate: `${progress * 300 - 150}deg` }}
            >
              <span className="absolute top-0 left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-areia shadow-[0_0_10px_rgba(222,201,168,0.8)]" />
            </div>
          </div>
          {cards}
        </div>
      </div>

      {controls && (
        <div
          data-deck-controls
          className={`flex w-full max-w-[420px] items-center ${compact ? "mt-1.5 gap-1" : "mt-3 gap-2"}`}
        >
          <DeckArrow direction="prev" disabled={index === 0} onClick={() => go(index - 1)} />
          <div className="min-w-0 flex-1 text-center">
            {renderCaption?.(front)}
            <p
              className={`font-semibold text-slate-400 tabular-nums ${compact ? "text-[10px]" : "mt-0.5 text-[11px]"}`}
              aria-hidden="true"
            >
              {index + 1} de {count}
            </p>
          </div>
          <DeckArrow direction="next" disabled={index === count - 1} onClick={() => go(index + 1)} />
        </div>
      )}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {itemLabel(front)}, {index + 1} de {count}
      </p>
    </div>
  );
}

function DeckArrow({
  direction,
  disabled,
  onClick,
}: {
  direction: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "prev" ? "Cartão anterior" : "Próximo cartão"}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white transition hover:bg-white/[0.12] disabled:cursor-default disabled:opacity-35 disabled:hover:bg-white/[0.06]"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        aria-hidden="true"
      >
        <path
          d={direction === "prev" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
