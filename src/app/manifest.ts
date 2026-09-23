import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Teadrop — Tabungan Bersama Circle",
    short_name: "Teadrop",
    description:
      "Kelola iuran bersama circle pertemanan: realtime, transparan, tanpa drama. Masuk, daftar, atau magic link.",
    start_url: "/",
    display: "standalone",
    background_color: "#050505",
    theme_color: "#4f46e5",
    orientation: "portrait",
    shortcuts: [
      {
        name: "Masuk",
        url: "/login?mode=masuk",
      },
      {
        name: "Buat Circle",
        url: "/login?mode=daftar&next=/",
      },
    ],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
