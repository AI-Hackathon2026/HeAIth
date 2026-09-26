import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@/client/styles/global.css";

export const metadata: Metadata = {
    title: "HeAIth — AI Health Platform",
    description: "AI 기반 건강 루틴과 상담 플랫폼",
    applicationName: "HeAIth",
    appleWebApp: { capable: true, title: "HeAIth", statusBarStyle: "black-translucent" },
    icons: {
        icon: [
            { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
            { url: "/icon.svg", type: "image/svg+xml" },
        ],
        apple: "/apple-touch-icon.png",
    },
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: "#0d1b2a",
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="ko">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
                {/* eslint-disable-next-line @next/next/no-page-custom-font */}
                <link
                    href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap"
                    rel="stylesheet"
                />
                <link
                    rel="stylesheet"
                    href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css"
                />
            </head>
            <body>
                <div id="root">{children}</div>
            </body>
        </html>
    );
}
