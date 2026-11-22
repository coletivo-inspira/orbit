import { credentialLabel } from "@/lib/community";
import type { CommunityPost } from "@/lib/types";

type Tone = "dark" | "light";

const BADGE = "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold";

const STYLES: Record<"pending" | "verified" | "community", Record<Tone, string>> = {
  pending: {
    dark: "border-areia/45 bg-areia/15 text-areia",
    light: "border-cobre/50 bg-areia/50 text-tinta",
  },
  verified: {
    dark: "border-salvia/45 bg-salvia/15 text-salvia",
    light: "border-presenca/40 bg-salvia text-presenca",
  },
  community: {
    dark: "border-white/20 bg-white/[0.07] text-marfim-suave",
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
