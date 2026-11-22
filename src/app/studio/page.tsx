import type { Metadata } from "next";
import { Studio } from "@/components/studio/Studio";

export const metadata: Metadata = {
  title: "Estúdio multi-dispositivo",
  description: "Demonstração do Orbit em computador, celular e relógio com estado sincronizado.",
};

export default function StudioPage() {
  return <Studio />;
}
