import type { AvatarConfig } from "@/lib/types";

/** Colors come from profile data; anything that isn't a plain color token is dropped. */
function color(value: string): string {
  return /^[#\w(),.%\s-]+$/.test(value) ? value : "#64748b";
}

/** Inner markup of the illustrated avatar (64×64 viewBox), shared by the React component and the graph canvas. */
export function avatarSvgInner(cfg: AvatarConfig, gradientId: string): string {
  const id = gradientId.replace(/[^\w-]/g, "");
  const bg = color(cfg.bg);
  const skin = color(cfg.skin);
  const hair = color(cfg.hair);
  const shirt = color(cfg.shirt);
  const parts = [
    `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${bg}"/><stop offset="100%" stop-color="#0f172a"/></linearGradient></defs>`,
    `<rect width="64" height="64" fill="url(#${id})"/>`,
    `<circle cx="52" cy="12" r="16" fill="rgba(255,255,255,0.08)"/>`,
    `<path d="M11 64 C11 49 20 44 32 44 C44 44 53 49 53 64 Z" fill="${shirt}"/>`,
    `<rect x="27" y="38" width="10" height="9" rx="4" fill="${skin}"/>`,
    `<circle cx="32" cy="28" r="13.5" fill="${skin}"/>`,
    `<path d="M18.5 26 C18.5 16 25 12 32 12 C39 12 45.5 16 45.5 26 C43 21 38 19 32 19 C26 19 21 21 18.5 26 Z" fill="${hair}"/>`,
  ];
  if (cfg.accessory === "cap") {
    parts.push(
      `<path d="M18 22 Q32 10 46 22 Z" fill="${shirt}"/>`,
      `<rect x="16" y="20" width="32" height="4" rx="2" fill="${shirt}"/>`,
    );
  }
  parts.push(
    `<circle cx="26.5" cy="27.5" r="1.8" fill="#0f172a"/>`,
    `<circle cx="37.5" cy="27.5" r="1.8" fill="#0f172a"/>`,
    `<path d="M27.5 33.5 Q32 37 36.5 33.5" fill="none" stroke="#7c2d12" stroke-width="1.7" stroke-linecap="round"/>`,
  );
  if (cfg.accessory === "beard") {
    parts.push(`<path d="M21 34 Q32 45 43 34 L42 39 Q32 47 22 39 Z" fill="${hair}" opacity="0.72"/>`);
  }
  if (cfg.accessory === "glasses") {
    const lens = `rx="2.5" fill="rgba(15,23,42,0.35)" stroke="#e2e8f0" stroke-width="1.6"`;
    parts.push(
      `<rect x="19" y="24" width="11" height="7" ${lens}/>`,
      `<rect x="34" y="24" width="11" height="7" ${lens}/>`,
      `<line x1="30" y1="27.5" x2="34" y2="27.5" stroke="#e2e8f0" stroke-width="1.6"/>`,
    );
  }
  return parts.join("");
}

/** Standalone SVG document at `size` px, for drawing the avatar as an image. */
export function avatarSvgDocument(cfg: AvatarConfig, size: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}">${avatarSvgInner(cfg, "g")}</svg>`;
}
