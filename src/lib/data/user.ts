import type { UserProfile } from "@/lib/types";

/** Demo account shown in "Modo Explorar" until real auth exists. */
export const DEMO_USER: UserProfile = {
  name: "Lucas Silva",
  firstName: "Lucas",
  age: 27,
  handle: "@lucassilva",
  city: "Belo Horizonte · MG",
  isPublic: true,
  primaryIntention: "troca",
  intentions: ["troca", "amizade", "apoio"],
  bio: "Construindo o Orbit — um hub social em Liquid Glass com comunidade, saúde e interações mais humanas.",
  avatar: { bg: "#4c1d95", skin: "#f1c27d", hair: "#1e1b4b", shirt: "#a855f7", accessory: "glasses" },
  apps: {
    grindr: { active: true, handle: "" },
    scruff: { active: true, handle: "" },
    tinder: { active: true, handle: "" },
    bumble: { active: false, handle: "" },
    insta: { active: true, handle: "@lucas.orbit" },
    spotify: { active: true, handle: "lucas.vibes" },
  },
  topics: ["tecnologia", "design", "cafe", "cinema", "ativismo"],
};

/**
 * Portrait in `public/profiles/` for the demo user's watch card. Kept out of `UserProfile` so
 * accounts already saved in localStorage need no migration; p13 never shows up on the watch radar.
 */
export const DEMO_USER_PHOTO = "p13.webp";

export function profileSlug(handle: string): string {
  return (handle || "lucassilva").replace("@", "");
}
