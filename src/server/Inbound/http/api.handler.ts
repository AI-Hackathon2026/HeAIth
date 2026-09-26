import { NextRequest } from "next/server";
import { getContainer } from "../../container";
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
        const container = getContainer();
        await container.ready;

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

        for (const middleware of matched.route.middlewares) {
            await middleware(req);
        }
        return await matched.route.handler(req);
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
        await notifyTechnicalError(err);
        return json({ message: "An unexpected error occurred." }, 500);
    }

    console.error("Unexpected error:", err);
    return json({ message: "An unexpected error occurred." }, 500);
}

async function notifyTechnicalError(err: TechnicalException) {
    try {
        const { emailUtil, config } = getContainer();
        const to = config.parsed().EMAIL_USER;
        if (!to) return;
        await emailUtil.sendEmail({
            to,
            subject: "Technical Error Occurred",
            text: `Error: ${err.message}\n\nStack Trace: ${err.stack}`,
        });
    } catch (emailError) {
        console.error("Failed to send technical error email.", emailError);
    }
}
