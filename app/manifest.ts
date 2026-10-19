import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "GanadIA",
    short_name: "GanadIA",
    description: "Tu finca, gestión inteligente. Plataforma de gestión agropecuaria.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#9B6D1C",
    lang: "es",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.svg?v=2", sizes: "192x192", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/icon-512.svg?v=2", sizes: "512x512", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
