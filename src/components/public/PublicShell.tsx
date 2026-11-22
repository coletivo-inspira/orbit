import Link from "next/link";
import type { ReactNode } from "react";
import { OrbitLogo } from "@/components/ui/OrbitLogo";

/** Chrome for public, indexable pages (no login required). */
export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-ambient-bg min-h-dvh">
      <header className="lg-header sticky top-0 z-20">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/comunidade" className="flex items-center gap-2 text-sm font-extrabold text-white">
            <OrbitLogo className="h-6 w-6" />
            Orbit <span className="font-medium text-slate-300/80">· Comunidade</span>
          </Link>
          <Link href="/" className="lg-btn-primary rounded-full px-4 py-1.5 text-xs font-bold text-white">
            Explorar o Orbit
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  );
}
