import fs from "fs";
import z from "zod";
import { NextResponse } from "next/server";
import { Container } from "../../container";
import KnhanesGroundingService from "../../application/services/knhanes.grounding.service";
import {
    BusinessException,
    BusinessExceptionType,
} from "../../shared/exceptions/business.exception";
import { buildInlineContentDisposition } from "../../shared/utils/filename.util";
import { Role } from "../../shared/types/enums";
import { ApiRequest, ApiRouter, json, noContent } from "../http/router";
import { validate } from "./controller.utils";
import { patchCharacterHeroStyleSchema } from "./_communication/request/character.request";
import { createChatSchema, deleteChatSchema, updateChatSchema } from "./_communication/request/chat.request";
import { createHealthstatusSchema, updateHealthstatusSchema } from "./_communication/request/healthcare.request";
import { projectionQuerySchema } from "./_communication/request/health-record.request";
import { knhanesQuerySchema } from "./_communication/request/knhanes.request";
import {
    changeModelSchema,
    createMessageSchema,
    deleteMessageSchema,
    updateMessageSchema,
} from "./_communication/request/message.request";
import {
    generateRoutineSchema,
    routineChatMessageSchema,
    updatePlanProgressSchema,
} from "./_communication/request/routine.request";
import { createUserSchema, signInSchema } from "./_communication/request/user.request";
import { UserMessage } from "./_communication/response/user.message";

/** Registers every API endpoint of the former Express server (same paths, below /api). */
export function registerRoutes(router: ApiRouter, c: Container) {
    const { checkAuth, isAdmin } = c.auth;

    // ── Auth (/auth) ─────────────────────────────────────────────
    router.post("/auth/signin", async (req) => {
        const dto = validate(signInSchema, req.body);
        const { username, accessToken, refreshToken, csrfValue } = await c.authCommandService.signIn(dto);
        const payload = c.tokenUtil.verifyToken({ token: accessToken });
        const res = json({ message: UserMessage.SIGNED_IN, username, role: payload.role });
        c.cookieUtil.setCookieWithTokens(res, accessToken, refreshToken, csrfValue);
        return res;
    });

    router.post("/auth/signup", async (req) => {
        const dto = validate(createUserSchema, { ...req.body, role: Role.USER });
        const user = await c.authCommandService.signUp(dto);
        return json({ message: UserMessage.ACCOUNT_CREATED, role: user.role });
    });

    router.patch("/auth/refresh", async (req) => {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            throw new BusinessException({ type: BusinessExceptionType.NOT_LOGGED_IN });
        }
        const { newAccessToken, newRefreshToken, newCsrfValue } =
            await c.authCommandService.refreshTokens(refreshToken);
        const res = json({ message: UserMessage.SESSION_REFRESHED });
        c.cookieUtil.setCookieWithTokens(res, newAccessToken, newRefreshToken, newCsrfValue);
        return res;
    });

    router.delete("/auth/signout", async (req) => {
        const refreshToken = req.cookies.refreshToken;
        if (refreshToken) {
            await c.authCommandService.signOut(refreshToken).catch(() => undefined);
        }
        const res = json({ message: UserMessage.SIGNED_OUT });
        c.cookieUtil.clearAuthCookies(res);
        return res;
    });

    router.post("/auth/check-email", async (req) => {
        await c.userQueryService.getUserByEmail(String(req.body.email ?? ""));
        return json({ message: UserMessage.ACCOUNT_EXISTS });
    });

    // ── Users (/users) ───────────────────────────────────────────
    router.post("/users/signup/user", async (req) => {
        const dto = validate(createUserSchema, { ...req.body, role: Role.USER });
        await c.userCommandService.createUser(dto);
        return noContent();
    });

    // The first admin account can be created openly; after that only an admin can add admins.
    router.post("/users/signup/admin", async (req) => {
        const users = await c.userQueryService.getUsers();
        if (users.some((user) => user.role === Role.ADMIN)) isAdmin(req);
        const dto = validate(createUserSchema, { ...req.body, role: Role.ADMIN });
        await c.userCommandService.createUser(dto);
        return noContent();
    });

    router.get("/users", isAdmin, async () => json(await c.userQueryService.getUsers()));

    router.get("/users/me/character", checkAuth, async (req) =>
        json(await c.characterQueryService.getCharacterProgress(req.userId)),
    );

    router.patch("/users/me/character", checkAuth, async (req) => {
        const dto = validate(patchCharacterHeroStyleSchema, req.body);
        return json(await c.characterCommandService.updateHeroStyle(req.userId, dto.heroStyle));
    });

    router.delete("/users/:userId", isAdmin, async (req) => {
        await c.userCommandService.deleteUser(req.params.userId);
        return noContent();
    });

    // ── Chats (/chat, also served as /chats like the old server) ──
    for (const base of ["/chat", "/chats"]) {
        router.post(base, checkAuth, async (req) => {
            const dto = validate(createChatSchema, { userId: req.userId, title: req.body.title });
            return json(await c.chatCommandService.saveChat(dto));
        });

        router.get(base, checkAuth, async (req) => json(await c.chatQueryService.showChats(req.userId)));

        router.get(`${base}/:chatId/messages`, checkAuth, async (req) =>
            json(await c.chatQueryService.listMessagesForUser(req.params.chatId, req.userId)),
        );

        router.get(`${base}/:chatId`, checkAuth, async (req) => {
            await c.chatQueryService.assertChatOwner(req.params.chatId, req.userId);
            return json(await c.chatQueryService.getChatHistory(req.params.chatId));
        });

        router.patch(`${base}/:chatId`, checkAuth, async (req) => {
            const dto = validate(updateChatSchema, {
                userId: req.userId,
                chatId: req.params.chatId,
                title: req.body.title,
            });
            return json(await c.chatCommandService.updateChat(dto));
        });

        router.delete(`${base}/:chatId`, checkAuth, async (req) => {
            const dto = validate(deleteChatSchema, { userId: req.userId, chatId: req.params.chatId });
            await c.chatCommandService.deleteChat(dto);
            return noContent();
        });

        router.patch(`${base}/:chatId/messages/:messageId`, checkAuth, async (req) => {
            const dto = validate(updateMessageSchema, {
                userId: req.userId,
                chatId: req.params.chatId,
                messageId: req.params.messageId,
                text: req.body.text,
            });
            await c.chatQueryService.assertChatOwner(dto.chatId, req.userId);
            return json(await c.chatCommandService.updateChatMessage(dto));
        });

        router.delete(`${base}/:chatId/messages/:messageId`, checkAuth, async (req) => {
            const dto = validate(deleteMessageSchema, {
                userId: req.userId,
                chatId: req.params.chatId,
                messageId: req.params.messageId,
            });
            await c.chatQueryService.assertChatOwner(dto.chatId, req.userId);
            await c.chatCommandService.deleteChatMessage(dto);
            return noContent();
        });
    }

    // ── Chatbot (/chatbot) ───────────────────────────────────────
    router.post("/chatbot", checkAuth, async (req) => {
        const dto = validate(createMessageSchema, {
            role: Role.USER,
            chatId: req.body.chatId,
            text: req.body.text,
        });
        await c.chatQueryService.assertChatOwner(dto.chatId, req.userId);
        return json(await c.chatbotCommandService.sendMessage(dto));
    });

    router.post("/chatbot/embedding", checkAuth, async (req) =>
        json(await c.chatbotCommandService.getEmbedding(req.body.text)),
    );

    router.get("/chatbot/available_models", checkAuth, async () =>
        json(await c.chatbotCommandService.showAvailableModels()),
    );

    router.get("/chatbot/model", checkAuth, async () =>
        json(await c.chatbotCommandService.getCurrentModel()),
    );

    router.patch("/chatbot/model", checkAuth, async (req) => {
        const { model } = validate(changeModelSchema, req.body);
        await c.chatbotCommandService.changeModel(model);
        return json({ message: "Model changed successfully to " + model });
    });

    // ── KNHANES (/knhanes) ───────────────────────────────────────
    router.post("/knhanes/query", checkAuth, async (req) => {
        const dto = validate(knhanesQuerySchema, req.body);
        const result = await c.knhanesService.queryMetric(dto.fileName, dto.metric, dto.filters);
        if (!result) {
            return json({ message: "Metric not found in dataset." }, 404);
        }

        const response: Record<string, unknown> = {
            metricName: dto.metric,
            nationalAverage: result.value,
            source: {
                file: result.file,
                sheet: result.sheet,
                rowIndex: result.rowIndex,
                colIndex: result.colIndex,
                raw: result.raw,
            },
        };
        if (dto.userValue !== undefined && result.value !== null) {
            response.userDeviation = dto.userValue - result.value;
            response.userDeviationPercent = ((dto.userValue - result.value) / result.value) * 100;
        }
        return json(response);
    });

    router.get("/knhanes/files", checkAuth, async () => json({ files: await c.knhanesService.listFiles() }));

    router.post("/knhanes/ground", checkAuth, async (req) => {
        const bodySchema = z.object({
            sex: z.string().optional(),
            age: z.string().optional(),
            income: z.string().optional(),
        });
        const dto = validate(bodySchema, req.body);
        const grounding = new KnhanesGroundingService(c.knhanesService);
        return json(await grounding.buildRoutine(dto));
    });

    // ── Files / PDF documents (/files, admin only) ───────────────
    router.post("/files/upload", isAdmin, async (req) => {
        const uploads = (req.formData?.getAll("pdf") ?? []).filter(
            (value): value is File => typeof value !== "string",
        );
        if (!uploads.length) {
            return json(
                { message: "No files uploaded. Use multipart/form-data with field name 'pdf'." },
                400,
            );
        }
        await c.fileCommandService.saveFiles(
            await Promise.all(
                uploads.map(async (file) => ({
                    originalname: file.name,
                    buffer: Buffer.from(await file.arrayBuffer()),
                })),
            ),
        );
        return noContent();
    });

    router.get("/files", isAdmin, async () => json(await c.fileQueryService.getAllFiles()));

    router.get("/files/search", isAdmin, async (req) =>
        json(await c.fileQueryService.getFilesByName(req.query.get("filename") ?? "")),
    );

    router.get("/files/find", isAdmin, async (req) =>
        json(await c.fileQueryService.searchFiles(req.query.get("keyword") ?? "")),
    );

    // Replaces the S3 presigned URL: bundled PDFs are static files, uploads stream from /files/raw/:id.
    router.get("/files/download/:id", isAdmin, async (req) => {
        const file = await c.fileQueryService.getFile(req.params.id);
        const location = c.library.getPdfLocation(file.id);
        if (!location) {
            return json({ message: "File not found" }, 404);
        }
        const url =
            location.kind === "url"
                ? location.url
                : `/api/files/raw/${encodeURIComponent(file.id)}`;
        return json({ url, filename: file.filename, expiresIn: 300 });
    });

    router.get("/files/raw/:id", isAdmin, async (req) => {
        const doc = c.library.find(req.params.id);
        const location = doc && c.library.getPdfLocation(doc.id);
        if (!doc || !location) {
            return json({ message: "File not found" }, 404);
        }
        if (location.kind === "url") {
            return new Response(null, { status: 302, headers: { Location: location.url } });
        }
        return new NextResponse(new Uint8Array(fs.readFileSync(location.filePath)), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": buildInlineContentDisposition(doc.filename),
            },
        });
    });

    router.get("/files/rag/store", isAdmin, async () => {
        const store = await c.ragQueryService.getStore();
        return json(store ?? { message: "No RAG store has been created yet." });
    });

    router.get("/files/rag/documents", isAdmin, async () => json(await c.ragQueryService.getDocuments()));

    router.delete("/files/rag/documents", isAdmin, async (req) => {
        const { name } = req.body as { name?: string };
        if (!name) {
            return json({ message: "Document name is required in the request body." }, 400);
        }
        await c.fileCommandService.deleteRagDocument(name);
        return noContent();
    });

    router.delete("/files/rag/store", isAdmin, async (req) => {
        const all = ["true", "1", "yes"].includes((req.query.get("all") ?? "").toLowerCase());
        return json(await c.fileCommandService.deleteRagStore(all));
    });

    router.get("/files/:id", isAdmin, async (req) => json(await c.fileQueryService.getFile(req.params.id)));

    router.delete("/files/:id", isAdmin, async (req) => {
        await c.fileCommandService.deleteFile(req.params.id);
        return noContent();
    });

    // ── Health status (/healthstatus) ────────────────────────────
    router.post("/healthstatus", checkAuth, async (req) => {
        const dto = validate(createHealthstatusSchema, req.body);
        return json(await c.healthstatusCommandService.createHealthstatus(req.userId, dto), 201);
    });

    router.get("/healthstatus", checkAuth, async (req) =>
        json(await c.healthstatusCommandService.getHealthstatus(req.userId)),
    );

    router.patch("/healthstatus/:id", checkAuth, async (req) => {
        const dto = validate(updateHealthstatusSchema, { ...req.body, id: req.params.id });
        return json(await c.healthstatusCommandService.updateHealthstatus(req.userId, dto));
    });

    // ── Health records (/health-records) ─────────────────────────
    router.get("/health-records/me/projection", checkAuth, async (req) => {
        const { disease } = validate(projectionQuerySchema, Object.fromEntries(req.query));
        return json(await c.healthRecordCommandService.getProjectedReduction(req.userId, disease));
    });

    router.get("/health-records/me", checkAuth, async (req) =>
        json(await c.healthRecordQueryService.getMyRecord(req.userId)),
    );

    // ── Routines (/routines) ─────────────────────────────────────
    router.get("/routines/me", checkAuth, async (req) =>
        json(await c.routineQueryService.getActiveRoutine(req.userId)),
    );

    router.post("/routines/generate", checkAuth, async (req) => {
        const { difficulty } = validate(generateRoutineSchema, req.body);
        return json(await c.routineCommandService.generateRoutine(req.userId, difficulty), 201);
    });

    router.put("/routines/me", checkAuth, async (req) => {
        const { difficulty } = validate(generateRoutineSchema, req.body);
        return json(await c.routineCommandService.updateRoutine(req.userId, difficulty));
    });

    router.delete("/routines/me", checkAuth, async (req) => {
        await c.routineCommandService.deleteAllRoutines(req.userId);
        return noContent();
    });

    const progressRoute =
        (
            update: (
                userId: string,
                id: string,
                body: z.infer<typeof updatePlanProgressSchema>,
            ) => Promise<unknown>,
            param: string,
        ) =>
        async (req: ApiRequest) => {
            const body = validate(updatePlanProgressSchema, req.body);
            return json(await update(req.userId, req.params[param], body));
        };

    router.patch(
        "/routines/nutrition-food-items/:foodItemId/progress",
        checkAuth,
        progressRoute((...args) => c.routineCommandService.updateNutritionFoodItemProgress(...args), "foodItemId"),
    );

    router.patch(
        "/routines/nutrition-plans/:planId/progress",
        checkAuth,
        progressRoute((...args) => c.routineCommandService.updateNutritionPlanProgress(...args), "planId"),
    );

    router.patch(
        "/routines/exercise-plans/:planId/progress",
        checkAuth,
        progressRoute((...args) => c.routineCommandService.updateExercisePlanProgress(...args), "planId"),
    );

    router.post("/routines/me/chat", checkAuth, async (req) =>
        json(await c.routineCommandService.ensureRoutineChat(req.userId)),
    );

    router.post("/routines/chat/:chatId/message", checkAuth, async (req) => {
        const { text } = validate(routineChatMessageSchema, req.body);
        return json(
            await c.routineCommandService.adjustRoutineViaChat(req.userId, req.params.chatId, text),
        );
    });
}
