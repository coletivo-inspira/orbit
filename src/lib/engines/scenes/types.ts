import type { BotDefinition, Point } from "@/lib/data/park";

export interface ViewRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Something drawn in depth order with the characters (sorted by `y`, its ground contact line). */
export interface SceneProp {
  y: number;
  minX: number;
  maxX: number;
  minY: number;
  draw: (ctx: CanvasRenderingContext2D, time: number) => void;
  /** Whether the prop covers a character standing at (x, y) behind it; the engine then draws it see-through. */
  hides?: (x: number, y: number) => boolean;
}

export interface SceneTap {
  toast?: { message: string; type?: "info" | "success" };
  walkTo?: Point;
}

/** A room the Parque engine can walk around in: the hand-drawn pilot park or a clay city room. */
export interface ParkScene {
  readonly world: { width: number; height: number };
  readonly spawn: Point;
  readonly bots: BotDefinition[];
  readonly background: string;
  /** Where the player sits in the view, as a fraction of its height (0.5 = centered); lower shows more of tall landmarks. */
  readonly cameraAnchorY?: number;
  /** Paçoca the cat only lives in the pilot park. */
  readonly pacoca?: Point;
  collides(x: number, y: number, radius: number): boolean;
  drawGround(ctx: CanvasRenderingContext2D, view: ViewRect, time: number): void;
  readonly props: SceneProp[];
  drawOverlay?(ctx: CanvasRenderingContext2D, view: ViewRect, time: number, player: Point): void;
  tap?(pt: Point): SceneTap | null;
}
