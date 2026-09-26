import { NextRequest } from "next/server";
import { handleApiRequest } from "@/server/Inbound/http/api.handler";

// The whole former Express backend is served from this one route handler.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Routine generation waits on Gemini; allow up to 60s (Vercel Hobby maximum).
export const maxDuration = 60;

type Context = { params: Promise<{ path: string[] }> };

async function handler(request: NextRequest, context: Context) {
    const { path } = await context.params;
    return handleApiRequest(request, path);
}

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };
