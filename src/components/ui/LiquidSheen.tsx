"use client";

import { useEffect } from "react";

/** Moves the specular highlight of `.lg-sheen` surfaces with the pointer. */
export function LiquidSheen() {
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const target = (e.target as Element | null)?.closest?.<HTMLElement>(".lg-sheen");
      if (!target) return;
      const rect = target.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      target.style.setProperty("--lg-x", `${(((e.clientX - rect.left) / rect.width) * 100).toFixed(1)}%`);
      target.style.setProperty("--lg-y", `${(((e.clientY - rect.top) / rect.height) * 100).toFixed(1)}%`);
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => document.removeEventListener("pointermove", onMove);
  }, []);
  return null;
}
