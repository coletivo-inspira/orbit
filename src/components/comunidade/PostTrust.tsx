import { credentialLabel } from "@/lib/community";
import type { CommunityPost } from "@/lib/types";

type Tone = "dark" | "light";

const BADGE = "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold";

const STYLES: Record<"pending" | "verified" | "community", Record<Tone, string>> = {
  pending: {
    dark: "border-amber-300/45 bg-amber-400/15 text-amber-100",
    light: "border-amber-700/40 bg-amber-100 text-amber-900",
  },
  verified: {
    dark: "border-emerald-300/45 bg-emerald-400/15 text-emerald-100",
    light: "border-presenca/40 bg-salvia text-presenca",
  },
  community: {
    dark: "border-white/20 bg-white/[0.07] text-slate-200",
    light: "border-linha bg-marfim text-texto-suave",
  },
};

export function PostTrustBadge({ post, tone = "dark" }: { post: CommunityPost; tone?: Tone }) {
  if (post.kind === "artigo" && post.status === "em_revisao") {
    return <span className={`${BADGE} ${STYLES.pending[tone]}`}>⏳ Em revisão</span>;
  }
  if (post.kind === "artigo") {
    return (
      <span className={`${BADGE} ${STYLES.verified[tone]}`}>
        <svg
          viewBox="0 0 24 24"
          className="h-3 w-3"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
        Profissional verificado
      </span>
    );
  }
  return <span className={`${BADGE} ${STYLES.community[tone]}`}>Post da comunidade</span>;
}

export function verificationText(post: CommunityPost): string {
  if (post.kind === "discussao") return "Post da comunidade: relato pessoal, sem verificação profissional.";
  const credential = post.professional ? `${post.professional.name} · ${credentialLabel(post.professional)}` : "";
  if (post.status === "em_revisao") return `${credential} — aguardando conferência no conselho (simulada na demo).`;
  return `${credential} — registro conferido (simulado na demo).`;
}
