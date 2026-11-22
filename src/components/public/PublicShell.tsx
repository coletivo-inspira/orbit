import Link from "next/link";
import type { ReactNode } from "react";
import { OrbitSignature } from "@/components/ui/OrbitLogo";

/** Chrome for public, indexable pages (no login required): opaque ivory reading surface per the brandbook. */
export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="superficie-clara min-h-dvh bg-marfim text-tinta">
      <a
        href="#conteudo"
        className="fixed top-2 left-2 z-30 -translate-y-[200%] rounded-lg bg-marfim px-3 py-2 text-sm font-bold text-tinta focus:translate-y-0"
      >
        Pular para o conteúdo
      </a>
      <header className="sticky top-0 z-20 border-b border-white/20 bg-noite text-marfim [--foco:var(--color-marfim)]">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-2.5">
          <Link href="/comunidade" className="rounded-lg">
            <OrbitSignature subtitle={<span className="mt-1 text-[11px] font-medium text-areia">Comunidade</span>} />
          </Link>
          <Link href="/" className="lg-btn-primary rounded-full px-4 py-2 text-xs font-bold">
            Explorar o Orbit
          </Link>
        </div>
      </header>
      <main id="conteudo" className="mx-auto max-w-4xl px-4 py-8">
        {children}
      </main>
    </div>
  );
}
