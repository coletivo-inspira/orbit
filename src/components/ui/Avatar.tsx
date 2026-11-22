import { useId, useState, type CSSProperties } from "react";
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

/** Round avatar with the colored intention ring used across the app. */
export function RingedAvatar({
  cfg,
  photo,
  color,
  size,
  ring = 2.5,
  halo = true,
  className = "",
  children,
}: {
  cfg: AvatarConfig;
  photo?: string;
  color: string;
  size: number;
  ring?: number;
  halo?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const style: CSSProperties = {
    width: size,
    height: size,
    boxShadow: `0 0 0 ${ring}px ${color}${halo ? `, 0 0 0 ${ring * 2}px rgba(255,255,255,0.14)` : ""}`,
  };
  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }}>
      <div className="h-full w-full overflow-hidden rounded-full" style={style}>
        <ProfileImage cfg={cfg} photo={photo} />
      </div>
      {children}
    </div>
  );
}
