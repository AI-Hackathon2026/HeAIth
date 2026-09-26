"use client";

import dynamic from "next/dynamic";

// The SPA relies on browser APIs (sessionStorage, document.cookie, pdf.js), so it is never server-rendered.
const App = dynamic(() => import("@/client/main"), { ssr: false });

export function ClientApp() {
    return <App />;
}
