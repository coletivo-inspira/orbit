import { ExternalLinkIcon } from "@/components/comunidade/ExternalLinkIcon";
import { redditCommunitiesFor, redditUrl } from "@/lib/data/reddit";
import type { CommunityCategory } from "@/lib/types";

type Tone = "dark" | "light";

const STYLES: Record<Tone, { title: string; muted: string; item: string; icon: string; name: string; lang: string }> = {
  dark: {
    title: "text-white",
    muted: "text-slate-300",
    item: "lg-pill",
    icon: "border-areia/40 bg-areia/15 text-areia",
    name: "text-white",
    lang: "bg-white/10 text-slate-200",
  },
  light: {
    title: "text-tinta",
    muted: "text-texto-suave",
    item: "border border-linha bg-marfim transition-colors hover:border-cobre",
    icon: "border-cobre/40 bg-leitura text-cobre-texto",
    name: "text-tinta",
    lang: "bg-leitura text-texto-suave",
  },
};

function CommunityIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M17 9a6 6 0 0 0-12 0c0 1.3.4 2.5 1.1 3.5L5 16l3.6-1.1A6 6 0 0 0 17 9Z" />
      <path d="M19.4 11.5A5 5 0 0 1 18.6 18l.9 3-3-.9a5 5 0 0 1-5.2-.6" />
    </svg>
  );
}

/** Outbound-only list: the Orbit forum is the moderated space, Reddit hosts larger existing communities. */
export function RedditCommunities({
  filter = "all",
  limit,
  tone = "dark",
}: {
  filter?: "all" | CommunityCategory;
  limit?: number;
  tone?: Tone;
}) {
  const communities = redditCommunitiesFor(filter).slice(0, limit);
  const s = STYLES[tone];
  return (
    <section aria-label="Comunidades no Reddit">
      <h2 className={`font-sans text-sm font-extrabold ${s.title}`}>Comunidades no Reddit</h2>
      <p className={`mt-1 text-xs leading-snug ${s.muted}`}>
        Comunidades maiores que já existem. Os links abrem o Reddit em nova aba; conteúdo, regras e moderação são de lá.
      </p>
      <ul className="mt-2.5 space-y-2">
        {communities.map((c) => (
          <li key={c.name}>
            <a
              href={redditUrl(c.name)}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-start gap-2.5 rounded-2xl p-2.5 ${s.item}`}
            >
              <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border ${s.icon}`}>
                <CommunityIcon />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className={`truncate text-xs font-bold ${s.name}`}>r/{c.name}</span>
                  <span className={`rounded-full px-1.5 py-px text-[10px] font-bold ${s.lang}`}>
                    {c.language === "pt-BR" ? "PT" : "EN"}
                  </span>
                </span>
                <span className={`mt-0.5 block text-xs leading-snug ${s.muted}`}>{c.description}</span>
              </span>
              <ExternalLinkIcon className={`mt-1 h-3 w-3 shrink-0 ${s.muted}`} />
              <span className="sr-only">(abre o Reddit em nova aba)</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
