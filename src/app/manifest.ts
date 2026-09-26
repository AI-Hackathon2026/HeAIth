import type { MetadataRoute } from "next";

// Same web app manifest the Vite PWA plugin generated.
export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "HeAIth — AI Health Platform",
        short_name: "HeAIth",
        description: "AI 기반 건강 루틴과 상담 플랫폼",
        theme_color: "#0d1b2a",
        background_color: "#0d1b2a",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: "/",
        scope: "/",
        lang: "ko",
        categories: ["health", "medical", "lifestyle"],
        icons: [
            { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
            { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
            { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
    };
}
