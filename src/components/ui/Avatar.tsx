import { useId, useState } from "react";
import { aroVidro, OrbeVidro } from "@/components/ui/OrbeVidro";
import { avatarSvgInner } from "@/lib/avatarSvg";
import { profilePhotoUrl } from "@/lib/publicUrl";
import type { AvatarConfig } from "@/lib/types";

/** Illustrated SVG avatar; also the fallback when a profile photo is missing or fails to load. */
export function Avatar({ cfg, className = "h-full w-full" }: { cfg: AvatarConfig; className?: string }) {
  const gradientId = `avatar-bg-${useId().replace(/:/g, "")}`;
  return (
    <svg
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={`block ${className}`}
      aria-hidden="true"
      // Markup built from the avatar colors only (see avatarSvgInner), shared with the graph canvas.
      dangerouslySetInnerHTML={{ __html: avatarSvgInner(cfg, gradientId) }}
    />
  );
}

/** AI-generated portrait of a fictional demo profile, falling back to the illustrated avatar. */
export function ProfileImage({ cfg, photo, alt = "" }: { cfg: AvatarConfig; photo?: string; alt?: string }) {
  const [failed, setFailed] = useState(false);
  if (!photo || failed) return <Avatar cfg={cfg} />;
  return (
    // Static export with `images.unoptimized`: next/image would add no optimization here.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={profilePhotoUrl(photo)}
      alt={alt}
      width={320}
      height={320}
      decoding="async"
      draggable={false}
      onError={() => setFailed(true)}
      className="block h-full w-full object-cover"
    />
  );
}

/** Round avatar in the glass orb tinted by the intention color, used across the app. */
export function RingedAvatar({
  cfg,
  photo,
  color,
  size,
  online = true,
  ring,
  halo = true,
  className = "",
  children,
}: {
  cfg: AvatarConfig;
  photo?: string;
  color: string;
  size: number;
  /** Offline profiles get frosted, less saturated glass. */
  online?: boolean;
  /** Minimum rim thickness in px; the rim otherwise scales with `size`. */
  ring?: number;
  /** Soft lift shadow under the orb. */
  halo?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }}>
      <OrbeVidro
        cor={color}
        online={online}
        size={size}
        aro={Math.max(ring ?? 0, aroVidro(size))}
        sombra={halo ? "0 10px 22px -6px rgb(6 10 15 / 55%)" : undefined}
      >
        <ProfileImage cfg={cfg} photo={photo} />
      </OrbeVidro>
      {children}
    </div>
  );
}
