import { NextResponse } from "next/server";

/** What handlers and middlewares see for one API call (the Express `req` equivalent). */
export type ApiRequest = {
    method: string;
    /** Path below /api, e.g. "/chat/123/messages". */
    path: string;
    params: Record<string, string>;
    query: URLSearchParams;
    headers: Headers;
    cookies: Record<string, string>;
    /** Parsed JSON body ({} when absent), or the FormData of a multipart request. */
    body: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    formData?: FormData;
    /** Set by the auth middleware. */
    userId: string;
    role: string;
};

export type Handler = (req: ApiRequest) => Promise<Response>;
/** Throws to reject the request; otherwise may enrich `req` (e.g. set userId). */
export type Middleware = (req: ApiRequest) => void | Promise<void>;

type Route = {
    method: string;
    segments: string[];
    middlewares: Middleware[];
    handler: Handler;
};

export class ApiRouter {
    private readonly _routes: Route[] = [];

    /** Registers a route. Patterns use Express syntax (`/chat/:chatId`); first match wins. */
    add(method: string, pattern: string, ...chain: [...Middleware[], Handler]) {
        const handler = chain[chain.length - 1] as Handler;
        const middlewares = chain.slice(0, -1) as Middleware[];
        this._routes.push({ method, segments: splitPath(pattern), middlewares, handler });
    }

    get(pattern: string, ...chain: [...Middleware[], Handler]) {
        this.add("GET", pattern, ...chain);
    }
    post(pattern: string, ...chain: [...Middleware[], Handler]) {
        this.add("POST", pattern, ...chain);
    }
    put(pattern: string, ...chain: [...Middleware[], Handler]) {
        this.add("PUT", pattern, ...chain);
    }
    patch(pattern: string, ...chain: [...Middleware[], Handler]) {
        this.add("PATCH", pattern, ...chain);
    }
    delete(pattern: string, ...chain: [...Middleware[], Handler]) {
        this.add("DELETE", pattern, ...chain);
    }

    match(method: string, path: string) {
        const segments = splitPath(path);
        for (const route of this._routes) {
            if (route.method !== method || route.segments.length !== segments.length) continue;
            const params: Record<string, string> = {};
            const matched = route.segments.every((segment, i) => {
                if (segment.startsWith(":")) {
                    params[segment.slice(1)] = decodeURIComponent(segments[i]);
                    return true;
                }
                return segment === segments[i];
            });
            if (matched) return { route, params };
        }
        return null;
    }
}

const splitPath = (path: string) => path.split("/").filter(Boolean);

export const json = (data: unknown, status = 200) => NextResponse.json(data ?? null, { status });

export const noContent = () => new NextResponse(null, { status: 204 });
