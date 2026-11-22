import Link from "next/link";
import type { ReactNode } from "react";
import { buttonClass } from "@/components/ui/Button";
import { OrbitSignature } from "@/components/ui/OrbitLogo";

/** Chrome for public, indexable pages (no login required): opaque ivory reading surface per the brandbook. */
export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="superficie-clara min-h-dvh bg-marfim text-tinta">
      <a
        href="#conteudo"
        className="fixed top-2 left-2 z-30 -translate-y-[200%] rounded-full bg-marfim px-4 py-2 text-sm font-bold text-tinta focus:translate-y-0"
      >
        Pular para o conteúdo
      </a>
      <header className="lg-glass lg-header sticky top-0 z-20 text-marfim [--foco:var(--color-marfim)]">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-2.5">
          <Link href="/comunidade" className="rounded-full">
            <OrbitSignature subtitle={<span className="mt-1 text-xs font-medium text-areia">Comunidade</span>} />
          </Link>
          <Link href="/" className={buttonClass({ variant: "primario", size: "compacto" })}>
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
