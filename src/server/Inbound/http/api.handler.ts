import { NextRequest } from "next/server";
import { getContainer } from "../../container";
import { describeBlobCredentials } from "../../outbound/store/blob.storage";
import { BusinessException } from "../../shared/exceptions/business.exception";
import {
    TechnicalException,
    TechnicalExceptionType,
} from "../../shared/exceptions/technical.exception";
import { registerRoutes } from "../controller/routes";
import { ApiRequest, ApiRouter, json } from "./router";

let router: ApiRouter | null = null;

function getRouter() {
    if (!router) {
        router = new ApiRouter();
        registerRoutes(router, getContainer());
    }
    return router;
}

async function readBody(request: NextRequest): Promise<Pick<ApiRequest, "body" | "formData">> {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
        const formData = await request.formData();
        return { body: {}, formData };
    }
    const text = await request.text();
    if (!text) return { body: {} };
    try {
        return { body: JSON.parse(text) };
    } catch {
        return { body: {} };
    }
}

/** Entry point for every /api/* request; mirrors the old Express app + error middleware. */
export async function handleApiRequest(request: NextRequest, pathSegments: string[]): Promise<Response> {
    const path = "/" + pathSegments.map(encodeURIComponent).join("/");
    try {
        if (request.method === "GET" && path === "/health") {
            return await healthCheck();
        }

        const matched = getRouter().match(request.method, path);
        if (!matched) {
            return json({ message: `Cannot ${request.method} ${path}` }, 404);
        }

        const req: ApiRequest = {
            method: request.method,
            path,
            params: matched.params,
            query: request.nextUrl.searchParams,
            headers: request.headers,
            cookies: Object.fromEntries(request.cookies.getAll().map((c) => [c.name, c.value])),
            ...(await readBody(request)),
            userId: "",
            role: "",
        };

        const { store, library } = getContainer();
        await store.sync();
        await library.prepare();

        let response: Response;
        try {
            for (const middleware of matched.route.middlewares) {
                await middleware(req);
            }
            response = await matched.route.handler(req);
        } catch (err) {
            response = await toErrorResponse(err);
        }

        // Persist before responding: a serverless instance may be frozen right after.
        await store.commit();
        return response;
    } catch (err) {
        return toErrorResponse(err);
    }
}

async function toErrorResponse(err: unknown): Promise<Response> {
    if (err instanceof BusinessException) {
        return json({ message: err.message }, err.statusCode);
    }

    if (err instanceof TechnicalException) {
        if (err.type === TechnicalExceptionType.RESOURCE_NOT_FOUND) {
            return json({ message: err.message }, 404);
        }
        if (err.type === TechnicalExceptionType.UNIQUE_VIOLATION) {
            return json({ message: err.message }, 409);
        }
        console.error(err);
        return json({ message: "An unexpected error occurred." }, 500);
    }

    console.error("Unexpected error:", err);
    return json({ message: "An unexpected error occurred." }, 500);
}

/**
 * GET /api/health: reports which storage this deployment uses (never secret values)
 * and whether the data file can be read, so storage problems are visible at a glance.
 */
async function healthCheck(): Promise<Response> {
    const { store } = getContainer();
    const storage = store.isRemote
        ? { mode: "vercel-blob", credentials: describeBlobCredentials() }
        : process.env.VERCEL
          ? { mode: "temporary", warning: "No Vercel Blob store connected: data is lost when the instance restarts." }
          : { mode: "local-file" };
    try {
        await store.sync();
        return json({ status: "ok", storage });
    } catch (err) {
        console.error("[health] storage check failed:", err);
        return json({ status: "error", storage, error: err instanceof Error ? err.message : String(err) }, 503);
    }
}
