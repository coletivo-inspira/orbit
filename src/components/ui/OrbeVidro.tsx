import type { CSSProperties, ReactNode } from "react";

interface OrbeVidroProps {
  /** Status tint of the rim: the person's main intention color. */
  cor: string;
  /** Present/online: full tint and a soft halo. Offline: glass frosted toward gray. */
  online?: boolean;
  /** Outer size in px; omit to fill the parent (e.g. a deck card). */
  size?: number;
  /** Rim thickness in px; defaults to a share of `size`. */
  aro?: number;
  /** Extra drop shadow appended to the rim's own. */
  sombra?: string;
  className?: string;
  /** `span` keeps the markup valid inside buttons. */
  as?: "div" | "span";
  children: ReactNode;
}

export function aroVidro(size: number): number {
  return Math.round(Math.min(7, Math.max(2.5, size * 0.075)) * 10) / 10;
}

/**
 * Thick glass rim with iridescent reflections around a photo. Pure CSS gradients and shadows (no filters
 * or blur), so it stays cheap on the radar with hundreds of bubbles. Round unless `className` sets a radius.
 */
export function OrbeVidro({
  cor,
  online = true,
  size,
  aro,
  sombra,
  className = "",
  as: Tag = "div",
  children,
}: OrbeVidroProps) {
  const style: CSSProperties & Record<`--${string}`, string> = {
    "--tom": cor,
    "--aro": `${aro ?? aroVidro(size ?? 64)}px`,
  };
  if (sombra) style["--sombra"] = sombra;
  if (size !== undefined) {
    style.width = size;
    style.height = size;
  }
  return (
    <Tag className={`orbe-vidro ${className}`} data-online={online || undefined} style={style}>
      <Tag className="orbe-vidro-foto">{children}</Tag>
    </Tag>
  );
}
