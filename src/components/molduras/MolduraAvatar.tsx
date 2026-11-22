"use client";

import type { CSSProperties, ReactNode } from "react";
import { OrbeVidro } from "@/components/ui/OrbeVidro";
import { INTENTIONS } from "@/lib/data/intentions";
import { getMoldura, MOLDURA_PADRAO, type MolduraId } from "@/lib/molduras/catalogo";
import { molduraVisivel } from "@/lib/molduras/conquistas";
import { useOrbit } from "@/lib/state/OrbitProvider";

interface MolduraAvatarProps {
  molduraId: MolduraId;
  /** Main intention color; the classic frame is a glass orb tinted with it. */
  cor: string;
  size: number;
  /** Extra drop shadow under the avatar (e.g. the radar center). */
  sombra?: string;
  className?: string;
  children: ReactNode;
}

/** Round avatar wrapped by a collectible frame. Purely decorative: it adds no text for screen readers. */
export function MolduraAvatar({ molduraId, cor, size, sombra, className = "", children }: MolduraAvatarProps) {
  const m = getMoldura(molduraVisivel(getMoldura(molduraId)) ? molduraId : MOLDURA_PADRAO);
  const escala = size / 64;

  if (m.id === MOLDURA_PADRAO) {
    return (
      <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }} aria-hidden="true">
        <OrbeVidro cor={cor} size={size} sombra={sombra}>
          {children}
        </OrbeVidro>
      </div>
    );
  }

  const { anel, largura, girar, enfeite, brilho } = m.visual;
  const w = Math.max(2, largura * escala);
  const gap = Math.max(1.5, 2 * escala);
  const ringStyle: CSSProperties & { "--cor": string } = {
    "--cor": cor,
    inset: -(w + gap),
    background: anel,
    mask: `radial-gradient(farthest-side, transparent calc(100% - ${w}px), #000 calc(100% - ${w}px))`,
    WebkitMask: `radial-gradient(farthest-side, transparent calc(100% - ${w}px), #000 calc(100% - ${w}px))`,
  };
  const badge = Math.max(16, Math.round(size * 0.32));
  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      {brilho && (
        <div
          className="pointer-events-none absolute rounded-full"
          style={{ inset: -(w + gap), boxShadow: `0 0 ${Math.round(16 * escala)}px ${brilho}` }}
        />
      )}
      <div className={`pointer-events-none absolute rounded-full ${girar ? "moldura-girar" : ""}`} style={ringStyle} />
      <div className="h-full w-full overflow-hidden rounded-full" style={sombra ? { boxShadow: sombra } : undefined}>
        {children}
      </div>
      {enfeite && (
        <span
          className="pointer-events-none absolute flex items-center justify-center rounded-full border border-white/30 bg-noite leading-none shadow"
          style={{
            width: badge,
            height: badge,
            fontSize: badge * 0.58,
            top: -w - gap - badge * 0.15,
            right: -w - gap - badge * 0.15,
          }}
        >
          {enfeite}
        </span>
      )}
    </div>
  );
}

/** The signed-in user's avatar with the frame they chose. */
export function MolduraDoUsuario(props: Omit<MolduraAvatarProps, "molduraId" | "cor">) {
  const { state } = useOrbit();
  const cor = (INTENTIONS[state.user.primaryIntention] ?? INTENTIONS.troca).color;
  return <MolduraAvatar molduraId={state.molduras.ativa} cor={cor} {...props} />;
}
