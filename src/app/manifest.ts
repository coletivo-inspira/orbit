import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Orbit",
    short_name: "Orbit",
    description: "Hub social com Órbita, Parque 2D, Perfil Hub e Comunidade & Saúde.",
    lang: "pt-BR",
    id: `${basePath}/`,
    start_url: `${basePath}/`,
    scope: `${basePath}/`,
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b101d",
    theme_color: "#0b101d",
    icons: [{ src: `${basePath}/icon.svg`, sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
