import type { TabId } from "@/lib/types";
import { TapIcon } from "@/components/interesse/TapIcon";
import { PARK_BOTS } from "@/lib/data/park";

export interface NavItem {
  id: TabId;
  label: string;
  short: string;
  badge?: string;
  icon: React.ReactNode;
}

const iconProps = {
  className: "h-4 w-4",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** Desejos lives inside Meu Perfil Hub, so the Hub item stays highlighted there. */
export function isNavActive(item: NavItem, activeTab: TabId): boolean {
  return item.id === activeTab || (item.id === "perfil" && activeTab === "desejos");
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: "orbita",
    label: "Órbita & Perto",
    short: "Órbita",
    icon: (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="3.5" />
        <ellipse cx="12" cy="12" rx="9.5" ry="4.5" transform="rotate(-25 12 12)" />
      </svg>
    ),
  },
  {
    id: "parque",
    label: "Parque 2D",
    short: "Parque",
    badge: String(PARK_BOTS.length),
    icon: (
      <svg {...iconProps}>
        <path d="M12 3 6.5 11h3L7 17h10l-2.5-6h3L12 3z" />
        <path d="M12 17v4" />
      </svg>
    ),
  },
  {
    id: "interesse",
    label: "Interesse",
    short: "Interesse",
    icon: <TapIcon className="h-4 w-4" />,
  },
  {
    id: "comunidade",
    label: "Comunidade",
    short: "Comunidade",
    icon: (
      <svg {...iconProps}>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5" />
        <path d="M15.5 4.8a3.5 3.5 0 0 1 0 6.4" />
        <path d="M17.5 14.8c2.4.6 4 2.5 4 5.2" />
      </svg>
    ),
  },
  {
    id: "perfil",
    label: "Meu Perfil Hub",
    short: "Meu Hub",
    icon: (
      <svg {...iconProps}>
        <circle cx="12" cy="8" r="4" />
        <path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6" />
      </svg>
    ),
  },
];
