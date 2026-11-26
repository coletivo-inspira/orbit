import { hasTalked, latestLine, type Conversation } from "@/lib/conversas";
import type { Profile } from "@/lib/types";

interface SelosStatusProps {
  profile: Profile;
  /** Card variant only: Órbita shows the conversation as its own tappable balloon. */
  conversation?: Conversation;
  /** `orbe`: small badges around a radar bubble. `cartao`: a column on an Interesse card. */
  variant: "orbe" | "cartao";
  /** Watch radar: only the online dot. */
  minimal?: boolean;
}

/** Status badges of a person (online, de passagem, no Parque, conversa). Decorative; callers speak the status. */
export function SelosStatus({ profile: p, conversation, variant, minimal = false }: SelosStatusProps) {
  if (variant === "orbe") {
    return (
      <>
        {p.online && (
          <span
            className={`absolute right-0.5 bottom-0.5 ${minimal ? "h-2.5 w-2.5" : "h-3 w-3"} presenca-ponto rounded-full`}
          />
        )}
        {p.visitingFrom && !minimal && (
          <span
            title={`De passagem, mora em ${p.visitingFrom}`}
            className="absolute -bottom-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full border border-white/40 bg-noite text-xs shadow"
          >
            ✈️
          </span>
        )}
        {p.inPark && !minimal && (
          <span
            title="Está no Parque 2D"
            className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-white/40 bg-salvia text-xs shadow"
          >
            🌳
          </span>
        )}
      </>
    );
  }

  const chip =
    "flex h-8 w-8 items-center justify-center rounded-full border text-[15px] shadow-[0_6px_14px_rgba(10,14,19,0.45)]";
  return (
    <span className="pointer-events-none absolute inset-0 z-[1]" aria-hidden="true">
      <span className="absolute top-[9%] right-[8%] flex flex-col items-end gap-1.5">
        {p.online && (
          <span className={`${chip} border-white/40 bg-tinta/80`}>
            <span className="presenca-ponto h-3 w-3 rounded-full" />
          </span>
        )}
        {p.visitingFrom && <span className={`${chip} border-white/40 bg-noite`}>✈️</span>}
        {p.inPark && <span className={`${chip} border-white/40 bg-salvia`}>🌳</span>}
      </span>
      {hasTalked(conversation) && (
        <span
          className={`hq-balloon absolute bottom-[calc(8%+8px)] left-[8%] flex h-[26px] max-w-[44%] items-center rounded-full px-2.5 text-xs leading-none font-bold ${
            latestLine(conversation.theirs) ? "hq-balloon-filled text-tinta" : "hq-balloon-empty min-w-[34px]"
          }`}
        >
          <span className="truncate">{latestLine(conversation.theirs) ?? ""}</span>
        </span>
      )}
    </span>
  );
}
