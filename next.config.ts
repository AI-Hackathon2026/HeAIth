import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Trace files relative to this project, not a parent folder that has its own lockfile.
    outputFileTracingRoot: path.join(__dirname),
    // The API reads bundled data at runtime (document text for RAG, KNHANES Excel
    // tables, and the PDFs themselves when an admin embeds them into the Gemini
    // RAG store). Make sure those files are shipped with the serverless function.
    outputFileTracingIncludes: {
        "/api/[...path]": ["./data/documents/**/*", "./data/knhanes/**/*", "./public/documents/**/*"],
    },
    // Keep the PDF text extractor out of the bundle; it ships its own pdf.js build.
    serverExternalPackages: ["unpdf"],
};

export default nextConfig;
