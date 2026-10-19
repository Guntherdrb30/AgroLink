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
      { src: "/icons/ganadia-192.png?v=1", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/ganadia-512.png?v=1", sizes: "512x512", type: "image/png", purpose: "any maskable" },
      { src: "/logo/ganadia-icon.svg?v=1", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
