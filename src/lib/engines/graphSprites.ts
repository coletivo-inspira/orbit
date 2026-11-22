import { avatarSvgDocument } from "@/lib/avatarSvg";
import { profilePhotoUrl } from "@/lib/publicUrl";
import type { AvatarConfig } from "@/lib/types";

export interface AvatarSource {
  /** Photo file name (see profilePhotoUrl); the illustrated avatar is used while it loads or if it fails. */
  photo?: string;
  cfg: AvatarConfig;
}

/** Source images are drawn at up to this many device px; SVGs are rasterized at this size. */
const SOURCE_PX = 384;
const MAX_SPRITES = 4000;
/** New bitmaps made per frame; beyond that the nearest size already made is scaled for a frame or two. */
const SPRITES_PER_FRAME = 24;
const BUCKETS = [12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128, 160, 192, 256, 320, 384, 448];

/**
 * Sprite size for an on-screen size: the next bucket up (about 1.25× apart), so bitmaps are only ever
 * scaled down a little — sharp — and zooming reuses them instead of rasterizing every frame.
 */
export function spriteBucket(devicePx: number): number {
  const px = Math.ceil(devicePx);
  return BUCKETS.find((b) => b >= px) ?? BUCKETS[BUCKETS.length - 1];
}

/** Size variants per key, with a per-frame creation budget and a nearest-size fallback. */
class VariantCache<T> {
  private readonly variants = new Map<string, Map<number, T>>();
  private count = 0;
  private budget = SPRITES_PER_FRAME;
  /** A stand-in of another size was drawn this frame: another frame is needed to finish. */
  pending = false;

  beginFrame() {
    this.budget = SPRITES_PER_FRAME;
    this.pending = false;
  }

  get(key: string, size: number, create: () => T | null): T | null {
    const sizes = this.variants.get(key);
    const hit = sizes?.get(size);
    if (hit) return hit;
    if (this.budget <= 0 && sizes?.size) {
      this.pending = true;
      let best: T | null = null;
      let bestD = Infinity;
      sizes.forEach((v, s) => {
        const d = Math.abs(Math.log(s / size));
        if (d < bestD) {
          bestD = d;
          best = v;
        }
      });
      return best;
    }
    const made = create();
    if (!made) return null;
    this.budget--;
    if (++this.count > MAX_SPRITES) {
      this.variants.clear();
      this.count = 1;
    }
    const map = this.variants.get(key) ?? new Map<number, T>();
    map.set(size, made);
    this.variants.set(key, map);
    return made;
  }

  /** Drops every size of a key (its source image changed). */
  drop(key: string) {
    const sizes = this.variants.get(key);
    if (!sizes) return;
    this.count -= sizes.size;
    this.variants.delete(key);
  }
}

function sourceKey(src: AvatarSource): string {
  const c = src.cfg;
  return src.photo ? `photo:${src.photo}` : `svg:${c.bg}|${c.skin}|${c.hair}|${c.shirt}|${c.accessory}`;
}

function newCanvas(w: number, h: number): CanvasRenderingContext2D | null {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  return canvas.getContext("2d");
}

/**
 * Round avatar bitmaps (with their colored ring baked in) for the graph canvas, rendered at the
 * device-pixel size they are drawn at. Blitting a cached bitmap is far cheaper than clipping and
 * stroking every avatar on every frame, and it stays sharp at any zoom or devicePixelRatio because
 * the bitmap is re-made when the on-screen size bucket changes.
 */
export class AvatarSprites {
  private readonly images = new Map<string, HTMLImageElement | "failed">();
  private readonly sprites = new VariantCache<HTMLCanvasElement>();

  constructor(private readonly onLoad: () => void) {}

  beginFrame() {
    this.sprites.beginFrame();
  }

  get pending(): boolean {
    return this.sprites.pending;
  }

  /** The best image loaded so far: the photo, else the illustrated avatar, else null. */
  private image(src: AvatarSource): { img: HTMLImageElement; key: string } | null {
    const key = sourceKey(src);
    const cached = this.images.get(key);
    const fallback = () => (src.photo ? this.image({ cfg: src.cfg }) : null);
    if (cached === "failed") return fallback();
    if (cached) return cached.complete && cached.naturalWidth ? { img: cached, key } : fallback();
    const img = new Image();
    img.decoding = "async";
    img.onload = () => this.onLoad();
    img.onerror = () => {
      this.images.set(key, "failed");
      this.onLoad();
    };
    img.src = src.photo
      ? profilePhotoUrl(src.photo)
      : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(avatarSvgDocument(src.cfg, SOURCE_PX))}`;
    this.images.set(key, img);
    return fallback();
  }

  /**
   * Bitmap `devicePx` wide: the avatar disc plus a ring `ringRatio` × its radius, or null while
   * nothing has loaded yet.
   */
  get(src: AvatarSource, devicePx: number, ring?: string, ringRatio = 0): HTMLCanvasElement | null {
    const loaded = this.image(src);
    if (!loaded) return null;
    const px = spriteBucket(devicePx);
    return this.sprites.get(`${loaded.key}|${ring ?? ""}|${ringRatio}`, px, () =>
      this.render(loaded.img, px, ring, ringRatio),
    );
  }

  private render(img: HTMLImageElement, px: number, ring: string | undefined, ringRatio: number) {
    const ctx = newCanvas(px, px);
    if (!ctx) return null;
    const outer = px / 2;
    const r = ring ? outer / (1 + ringRatio) : outer;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.save();
    ctx.beginPath();
    ctx.arc(outer, outer, r, 0, Math.PI * 2);
    ctx.clip();
    // object-fit: cover
    const s = Math.max((2 * r) / img.naturalWidth, (2 * r) / img.naturalHeight);
    const w = img.naturalWidth * s;
    const h = img.naturalHeight * s;
    ctx.drawImage(img, outer - w / 2, outer - h / 2, w, h);
    ctx.restore();
    if (ring) {
      ctx.beginPath();
      ctx.arc(outer, outer, (r + outer) / 2, 0, Math.PI * 2);
      ctx.lineWidth = outer - r;
      ctx.strokeStyle = ring;
      ctx.stroke();
    }
    return ctx.canvas;
  }
}

export interface LabelSprite {
  canvas: HTMLCanvasElement;
  /** Size in device px, outline included. */
  width: number;
  height: number;
  /** Font size it was rendered at, in device px. */
  size: number;
}

/**
 * Node names pre-rendered with their dark outline. Stroking text on every frame is one of the most
 * expensive canvas operations; a cached bitmap per name and size is a single blit.
 */
/** Even device-px sizes only: zooming changes the text size in a few steps, not on every frame. */
export function labelSize(fontDevicePx: number): number {
  return Math.max(6, Math.round(fontDevicePx / 2) * 2);
}

export class LabelSprites {
  private readonly cache = new VariantCache<LabelSprite>();

  constructor(private readonly font: string) {}

  beginFrame() {
    this.cache.beginFrame();
  }

  get pending(): boolean {
    return this.cache.pending;
  }

  get(text: string, color: string, fontDevicePx: number): LabelSprite | null {
    const size = labelSize(fontDevicePx);
    return this.cache.get(`${color}|${text}`, size, () => this.render(text, color, size));
  }

  private render(text: string, color: string, size: number): LabelSprite | null {
    const outline = Math.max(2, Math.round(size * 0.26));
    const measure = newCanvas(1, 1);
    if (!measure) return null;
    measure.font = `600 ${size}px ${this.font}`;
    const textW = Math.ceil(measure.measureText(text).width);
    const w = textW + outline * 2 + 2;
    const h = Math.ceil(size * 1.35) + outline * 2;
    const ctx = newCanvas(w, h);
    if (!ctx) return null;
    ctx.font = `600 ${size}px ${this.font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.lineJoin = "round";
    ctx.lineWidth = outline;
    ctx.strokeStyle = "rgba(20, 28, 37, 0.92)";
    ctx.strokeText(text, w / 2, outline);
    ctx.fillStyle = color;
    ctx.fillText(text, w / 2, outline);
    return { canvas: ctx.canvas, width: w, height: h, size };
  }
}
