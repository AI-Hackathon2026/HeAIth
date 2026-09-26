import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Trace files relative to this project, not a parent folder that has its own lockfile.
    outputFileTracingRoot: path.join(__dirname),
    // The API reads bundled data at runtime (document text for RAG, KNHANES Excel
    // tables). Make sure those files are shipped with the serverless function.
    outputFileTracingIncludes: {
        "/api/[...path]": ["./data/documents/**/*", "./data/knhanes/**/*"],
    },
    // Keep the PDF text extractor out of the bundle; it ships its own pdf.js build.
    serverExternalPackages: ["unpdf"],
};

export default nextConfig;
