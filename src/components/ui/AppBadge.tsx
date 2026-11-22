import { EXTERNAL_APPS } from "@/lib/data/intentions";
import type { AppId } from "@/lib/types";

export function AppBadgeIcon({ appId, className = "h-3.5 w-3.5" }: { appId: AppId; className?: string }) {
  switch (appId) {
    case "grindr":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2C6.5 2 3 5.8 3 11.2c0 4.5 2.4 8.2 5.6 9.9.7.4 1.5-.1 1.5-.9v-1.3c.6.1 1.2.2 1.9.2s1.3-.1 1.9-.2v1.3c0 .8.8 1.3 1.5.9 3.2-1.7 5.6-5.4 5.6-9.9C21 5.8 17.5 2 12 2zm-3.2 9.8c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm6.4 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
        </svg>
      );
    case "scruff":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 3c-4.4 0-8 3.6-8 8 0 3.7 2.5 6.8 6 7.7V21l2-1.2 2 1.2v-2.3c3.5-.9 6-4 6-7.7 0-4.4-3.6-8-8-8zm-3 8a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm6 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm-3 4.5c-1.8 0-3.2-.8-4-2h8c-.8 1.2-2.2 2-4 2z" />
        </svg>
      );
    case "tinder":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M13.5 2.2c.6 3.2-1.2 5.4-3.1 6.3-.3-1.4-.1-2.8.4-3.9C7.3 6.5 5 10 5 13.7 5 18 8.3 21.5 12.6 21.5c4.2 0 7.4-3.2 7.4-7.5 0-4.8-3.1-9.2-6.5-11.8z" />
        </svg>
      );
    case "bumble":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2 4 6.5v11L12 22l8-4.5v-11L12 2zm-4 7h8v1.8H8V9zm1.2 3.2h5.6V14H9.2v-1.8zm1.5 3.2h2.6v1.8h-2.6v-1.8z" />
        </svg>
      );
    case "insta":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "spotify":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9.5" />
          <path d="M8 10.2c2.8-.8 5.8-.5 8.2.8" />
          <path d="M8.6 13.2c2.2-.6 4.6-.4 6.6.7" />
          <path d="M9.4 16c1.6-.4 3.4-.2 4.8.5" />
        </svg>
      );
  }
}

/** Circular app tile (brand color + glyph); brandbook v2 keeps every badge round. */
export function AppTile({
  appId,
  className = "h-5 w-5",
  iconClassName = "h-3 w-3",
}: {
  appId: AppId;
  className?: string;
  iconClassName?: string;
}) {
  const app = EXTERNAL_APPS[appId];
  return (
    <span
      title={`Ativo no ${app.name}`}
      className={`flex shrink-0 items-center justify-center rounded-full shadow-xs ring-1 ring-white/25 ${className}`}
      style={{ background: app.bg, color: app.textColor }}
    >
      <AppBadgeIcon appId={appId} className={iconClassName} />
    </span>
  );
}
