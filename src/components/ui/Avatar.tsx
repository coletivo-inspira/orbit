import { useId, useState, type CSSProperties } from "react";
import { profilePhotoUrl } from "@/lib/publicUrl";
import type { AvatarConfig } from "@/lib/types";

/** Illustrated SVG avatar; also the fallback when a profile photo is missing or fails to load. */
export function Avatar({ cfg, className = "h-full w-full" }: { cfg: AvatarConfig; className?: string }) {
  const gradientId = `avatar-bg-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" className={`block ${className}`} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={cfg.bg} />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" fill={`url(#${gradientId})`} />
      <circle cx="52" cy="12" r="16" fill="rgba(255,255,255,0.08)" />
      <path d="M11 64 C11 49 20 44 32 44 C44 44 53 49 53 64 Z" fill={cfg.shirt} />
      <rect x="27" y="38" width="10" height="9" rx="4" fill={cfg.skin} />
      <circle cx="32" cy="28" r="13.5" fill={cfg.skin} />
      <path
        d="M18.5 26 C18.5 16 25 12 32 12 C39 12 45.5 16 45.5 26 C43 21 38 19 32 19 C26 19 21 21 18.5 26 Z"
        fill={cfg.hair}
      />
      {cfg.accessory === "cap" && (
        <>
          <path d="M18 22 Q32 10 46 22 Z" fill={cfg.shirt} />
          <rect x="16" y="20" width="32" height="4" rx="2" fill={cfg.shirt} />
        </>
      )}
      <circle cx="26.5" cy="27.5" r="1.8" fill="#0f172a" />
      <circle cx="37.5" cy="27.5" r="1.8" fill="#0f172a" />
      <path d="M27.5 33.5 Q32 37 36.5 33.5" fill="none" stroke="#7c2d12" strokeWidth="1.7" strokeLinecap="round" />
      {cfg.accessory === "beard" && (
        <path d="M21 34 Q32 45 43 34 L42 39 Q32 47 22 39 Z" fill={cfg.hair} opacity="0.72" />
      )}
      {cfg.accessory === "glasses" && (
        <>
          <rect
            x="19"
            y="24"
            width="11"
            height="7"
            rx="2.5"
            fill="rgba(15,23,42,0.35)"
            stroke="#e2e8f0"
            strokeWidth="1.6"
          />
          <rect
            x="34"
            y="24"
            width="11"
            height="7"
            rx="2.5"
            fill="rgba(15,23,42,0.35)"
            stroke="#e2e8f0"
            strokeWidth="1.6"
          />
          <line x1="30" y1="27.5" x2="34" y2="27.5" stroke="#e2e8f0" strokeWidth="1.6" />
        </>
      )}
    </svg>
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
