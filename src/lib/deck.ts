/**
 * Geometry and physics of the stacked card deck (a loosely shuffled photo pile, like Instagram Instants).
 * The deck position is a float: its integer part is the front card, the fraction is how far that card has
 * already been thrown along the orbit towards the "seen" side.
 */

/** Cards peeking behind the front one. */
export const DECK_BEHIND = 3;
/** Orbit a seen card leaves along, in card widths, and how far round it travels (radians). */
const ORBIT_RADIUS = 1.7;
const ORBIT_SWEEP = 0.75;

export interface CardPose {
  /** Translation in % of the card size. */
  x: number;
  y: number;
  rotate: number;
  scale: number;
  opacity: number;
  /** Darkening over cards that are further back, 0–1. */
  shade: number;
  zIndex: number;
}

/** Stable pseudo-random value in [-1, 1] for a card, so the pile looks shuffled the same way every time. */
export function shuffleTilt(index: number): number {
  const x = Math.sin(index * 12.9898 + 4.1414) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

/** Pose of the card at `index` when the deck sits at `position`. */
export function cardPose(index: number, position: number): CardPose {
  const d = index - position;
  if (d < 0) {
    const t = Math.min(1, -d);
    const angle = t * ORBIT_SWEEP;
    return {
      x: -Math.sin(angle) * ORBIT_RADIUS * 100,
      y: (1 - Math.cos(angle)) * ORBIT_RADIUS * 100,
      rotate: -26 * t,
      scale: 1 - 0.08 * t,
      opacity: 1 - t,
      shade: 0,
      zIndex: 200,
    };
  }
  const back = Math.min(d, DECK_BEHIND + 1);
  const settle = Math.min(1, d);
  const tilt = shuffleTilt(index);
  const side = index % 2 === 0 ? 1 : -1;
  return {
    x: (side * 4 + tilt * 4) * settle,
    y: -3.5 * back,
    rotate: side * (6 + Math.abs(tilt) * 5) * settle,
    scale: 1 - 0.025 * back,
    opacity: d <= DECK_BEHIND ? 1 : Math.max(0, DECK_BEHIND + 1 - d),
    shade: Math.min(0.4, 0.1 * back),
    zIndex: 100 - Math.round(back * 10),
  };
}

/** Indices worth rendering at `position`: the card leaving, the front one and the few peeking behind. */
export function visibleRange(position: number, count: number): [number, number] {
  if (count <= 0) return [0, -1];
  const first = Math.max(0, Math.ceil(position - 1));
  const last = Math.min(count - 1, Math.floor(position + DECK_BEHIND + 1));
  return [first, last];
}

/** Dampens a drag past either end so the deck resists instead of stopping dead. */
export function rubberBand(position: number, count: number): number {
  const max = Math.max(0, count - 1);
  const resist = (over: number) => (0.6 * over) / (1 + over);
  if (position < 0) return -resist(-position);
  if (position > max) return max + resist(position - max);
  return position;
}

/** Card the deck settles on after a release at `position` moving at `velocity` cards per second. */
export function releaseTarget(position: number, velocity: number, count: number, from: number): number {
  const projected = position + velocity * 0.22;
  const reach = Math.round(from);
  const target = Math.round(Math.min(reach + DECK_BEHIND, Math.max(reach - DECK_BEHIND, projected)));
  return clampIndex(target, count);
}

export function clampIndex(index: number, count: number): number {
  return Math.min(Math.max(0, count - 1), Math.max(0, index));
}

export interface SpringState {
  position: number;
  velocity: number;
}

const STIFFNESS = 210;
const DAMPING = 25;

/** One semi-implicit Euler step of a slightly underdamped spring towards `target`; `dt` in seconds. */
export function springStep(state: SpringState, target: number, dt: number): SpringState {
  const step = Math.min(dt, 1 / 30);
  const velocity = state.velocity + (-STIFFNESS * (state.position - target) - DAMPING * state.velocity) * step;
  return { position: state.position + velocity * step, velocity };
}

export function springSettled(state: SpringState, target: number): boolean {
  return Math.abs(state.position - target) < 0.002 && Math.abs(state.velocity) < 0.02;
}
