import { GoogleGenAI } from "@google/genai";
import { BusinessException, BusinessExceptionType } from "../../shared/exceptions/business.exception";
import { IConfigUtil } from "../../shared/utils/config.util";
import { IChatbot } from "../../application/port/I.chatbot";
import { toAsciiSafeFilename } from "../../shared/utils/filename.util";
import { JsonStore } from "../store/json.store";
import fs from "fs/promises";
import os from "os";
import path from "path";

export enum GeminiVersion {
    // ✅ Stable - recommended for production use
    Gemini_2_5_Flash = "gemini-2.5-flash",
    Gemini_2_5_Flash_Lite = "gemini-2.5-flash-lite",

    // ✅ Latest stable aliases (auto-updates to newest generation)
    Gemini_Flash_Latest = "gemini-flash-latest",
    Gemini_Flash_Lite_Latest = "gemini-flash-lite-latest",

    // 🔬 Preview - most generous free tier (1,500 RPD)
    Gemini_3_Flash_Preview = "gemini-3-flash-preview",
    Gemini_3_1_Flash_Lite_Preview = "gemini-3.1-flash-lite-preview",
    Gemini_3_1_Flash_Lite = "gemini-3.1-flash-lite",
}

export class Gemini implements IChatbot {
    private _client: GoogleGenAI | null = null;

    constructor(
        private readonly _config: IConfigUtil,
        private readonly _store: JsonStore,
    ) {}

    isConfigured(): boolean {
        return Boolean(this._config.parsed().GEMINI_API_KEY);
    }

    /** The selected model is kept in the data file so it survives restarts. */
    private get _model(): string {
        return this._store.read((db) => db.settings.geminiModel) ?? GeminiVersion.Gemini_2_5_Flash;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private get _ai(): any {
        const apiKey = this._config.parsed().GEMINI_API_KEY;
        if (!apiKey) {
            throw new BusinessException({ type: BusinessExceptionType.AI_NOT_CONFIGURED });
        }
        this._client ??= new GoogleGenAI({ apiKey });
        return this._client;
    }

    async sendText(message: string) {
        try {
            const data = {};
            const contextPayload = JSON.stringify(data);

            const final_response = await this._ai.models.generateContent({
                model: this._model,
                config: {
                    systemInstruction: `You are an assistant with access to the user's workspace. Here is the entire system context files: ${contextPayload}. Give appropriate responses based on this data.`
                },
                contents: [{ role: 'user', parts: [{ text: message }] }],
            });

            return final_response.text;
        } catch (error) {
            if (error instanceof BusinessException) {
                throw error;
            }
            throw error;
        }
    }

    async embedText(message: string) {
        try {
            const response = await this._ai.models.embedContent({
                model: 'gemini-embedding-001',
                contents: message,
            });
            return response.embeddings;
        } catch (error) {
            throw error;
        }
    }

    async getAvailableModels() {
        try {
            return Object.values(GeminiVersion);
        } catch (error) {
            throw error;
        }
    }

    async changeModel(model: string) {
        this._store.write((db) => {
            db.settings.geminiModel = model;
        });
    }

    async getModelName() {
        return "You are using " + this._model;
    }

    async createFileSearchStore(displayName: string): Promise<string> {
        const store = await this._ai.fileSearchStores.create({
            config: {
                displayName,
                embeddingModel: "models/gemini-embedding-2",
            },
        });
        return store.name as string;
    }

    async uploadPdfToStore(buffer: Buffer, filename: string, storeName: string): Promise<void> {
        const MAX_SINGLE_UPLOAD = 95 * 1024 * 1024; // Gemini per-document limit is 100 MB
        if (buffer.length > MAX_SINGLE_UPLOAD) {
            throw new Error(`[RAG] ${filename} is larger than the 95 MB File Search limit`);
        }
        await this._uploadSinglePdf(buffer, toAsciiSafeFilename(filename), storeName, filename);
    }

    private async _uploadSinglePdf(
        buffer: Buffer,
        safeFilename: string,
        storeName: string,
        originalFilename: string,
    ): Promise<void> {
        const tempPath = path.join(os.tmpdir(), `rag-${Date.now()}-${safeFilename}`);
        await fs.writeFile(tempPath, buffer);
        try {
            let operation = await this._ai.fileSearchStores.uploadToFileSearchStore({
                file: tempPath,
                fileSearchStoreName: storeName,
                config: {
                    displayName: safeFilename,
                    mimeType: "application/pdf",
                    customMetadata: [{ key: "originalFilename", stringValue: originalFilename }],
                },
            });
            while (!operation.done) {
                await new Promise((resolve) => setTimeout(resolve, 5000));
                operation = await this._ai.operations.get({ operation });
            }
            if (operation.error) {
                throw new Error(`[RAG] Upload failed for ${safeFilename}: ${JSON.stringify(operation.error)}`);
            }
            console.log(`[RAG] Uploaded: ${safeFilename} (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`);
        } finally {
            await fs.unlink(tempPath).catch(() => undefined);
        }
    }

    async listStoreDocuments(storeName: string): Promise<Array<{ name: string; displayName: string }>> {
        const results: Array<{ name: string; displayName: string }> = [];
        const pager = await this._ai.fileSearchStores.documents.list({ parent: storeName });
        for await (const doc of pager) {
            results.push({
                name: doc.name ?? "",
                displayName: doc.displayName ?? "",
            });
        }
        return results;
    }

    async deleteStoreDocument(documentName: string): Promise<void> {
        await this._ai.fileSearchStores.documents.delete({
            name: documentName,
            config: { force: true },
        });
    }

    async listFileSearchStores(): Promise<Array<{ name: string; displayName: string }>> {
        const results: Array<{ name: string; displayName: string }> = [];
        const pager = await this._ai.fileSearchStores.list();
        for await (const store of pager) {
            results.push({
                name: store.name ?? "",
                displayName: store.displayName ?? "",
            });
        }
        return results;
    }

    async deleteFileSearchStore(storeName: string): Promise<void> {
        await this._ai.fileSearchStores.delete({
            name: storeName,
            config: { force: true },
        });
        console.log(`[RAG] Deleted File Search Store: ${storeName}`);
    }

    async sendTextWithDocumentContext(
        message: string,
        snippets: Array<{ filename: string; page: number; content: string }>,
    ): Promise<string> {
        const contextBlock = snippets
            .map((s) => `[출처: ${s.filename}, ${s.page}페이지]\n${s.content}`)
            .join("\n\n---\n\n");

        console.log(
            `[RAG] Using ${snippets.length} DB snippet(s): pages ${snippets.map((s) => s.page).join(", ")}`,
        );

        const response = await this._ai.models.generateContent({
            model: this._model,
            contents: [{ role: "user", parts: [{ text: message }] }],
            config: {
                systemInstruction:
                    `You are a health assistant for Korean users. Answer the user's question directly ` +
                    `using the DOCUMENT CONTEXT below.\n\n` +
                    `RULES:\n` +
                    `- Respond in Korean (해요체).\n` +
                    `- Focus on content that answers the question (definitions, findings, statistics).\n` +
                    `- IGNORE report introductions, publication info, and table-of-contents unless the user asks about the report itself.\n` +
                    `- Include specific numbers and percentages from the context when available.\n` +
                    `- Cite only pages you actually used at the end (e.g. "출처: 파일명, 26페이지").\n` +
                    `- Do not describe what the report is — explain the health topic the user asked about.\n` +
                    `- Never fabricate statistics.\n\n` +
                    `DOCUMENT CONTEXT:\n${contextBlock}`,
            },
        });
        return response.text ?? "";
    }

    async generateRoutineStructured(
        prompt: string,
        snippets: Array<{ filename: string; page: number; content: string }> = [],
    ): Promise<string> {
        const contextBlock =
            snippets.length > 0
                ? snippets
                      .map((s) => `[출처: ${s.filename}, ${s.page}페이지]\n${s.content}`)
                      .join("\n\n---\n\n")
                : "";

        const userText = contextBlock
            ? `${prompt}\n\nDOCUMENT CONTEXT (국민건강통계 — reportReadme 작성 근거. 페이지 번호는 ## 참고 문헌에만 표기):\n${contextBlock}`
            : prompt;

        const response = await this._ai.models.generateContent({
            model: this._model,
            contents: [{ role: "user", parts: [{ text: userText }] }],
            config: {
                responseMimeType: "application/json",
                systemInstruction:
                    "You are a health routine planner for Korean users. " +
                    "Respond with ONLY valid JSON (no markdown fences, no prose). " +
                    "The JSON MUST include both string fields: \"report\" (one-sentence routine story, no sources) " +
                    "and \"reportReadme\" (markdown readme). " +
                    "reportReadme: each food and exercise as a complete Korean sentence (no arrows). " +
                    "Do NOT put (출처: ...) on each line; list file names and pages only under ## 참고 문헌. " +
                    "Only cite pages from DOCUMENT CONTEXT — never invent page numbers. " +
                    "routine[].exerciseRoutine and routine[].nutritionRoutine must be arrays. " +
                    "Each weekday must have different meal menus — do not repeat the same breakfast/lunch/dinner food combinations across days in the same week. " +
                    "Each meal foods entry must be { \"name\": string, \"calories\": number } with realistic per-serving kcal; " +
                    "meal calories must equal the sum of its food calories.",
            },
        });

        if (snippets.length > 0) {
            console.log(
                `[RAG] Routine generation using ${snippets.length} snippet(s): pages ${snippets.map((s) => s.page).join(", ")}`,
            );
        }

        return response.text ?? "";
    }

    async adjustRoutineStructured(
        prompt: string,
        snippets: Array<{ filename: string; page: number; content: string }> = [],
    ): Promise<string> {
        const contextBlock =
            snippets.length > 0
                ? snippets
                      .map((s) => `[출처: ${s.filename}, ${s.page}페이지]\n${s.content}`)
                      .join("\n\n---\n\n")
                : "";

        const userText = contextBlock
            ? `${prompt}\n\nDOCUMENT CONTEXT (건강 통계 참고):\n${contextBlock}`
            : prompt;

        const response = await this._ai.models.generateContent({
            model: this._model,
            contents: [{ role: "user", parts: [{ text: userText }] }],
            config: {
                responseMimeType: "application/json",
                systemInstruction:
                    "You are a health routine coach for Korean users. " +
                    "Help users adjust their existing weekly routine to be more achievable. " +
                    "Respond with ONLY valid JSON (no markdown fences). " +
                    "Always include userMessage (natural Korean reply in 해요체). " +
                    "Only include dayChanges when the user asks to change meals or exercises; " +
                    "for general questions, set dayChanges to [] and summary to null. " +
                    "When nutritionRoutine is included, meals MUST contain exactly BREAKFAST, LUNCH, and DINNER; " +
                    "copy unchanged meals from the current routine JSON. " +
                    "When changing meals, use menus different from other weekdays in the current routine — avoid duplicate daily meal combinations across the week. " +
                    "dayChanges must use dayOfWeek (MONDAY..SUNDAY). " +
                    "Each meal foods entry: { \"name\": string, \"calories\": number } with realistic kcal; " +
                    "meal calories must equal the sum of food calories.",
            },
        });

        return response.text ?? "";
    }

    async sendTextWithFileSearch(message: string, storeNames: string[]): Promise<string> {
        const response = await this._ai.models.generateContent({
            model: this._model,
            contents: message,
            config: {
                systemInstruction:
                    `You are a knowledgeable health assistant for Korean users, with access to ` +
                    `uploaded PDF documents from the Korea Disease Control and Prevention Agency (질병관리청). ` +

                    `LANGUAGE RULE: Always respond in Korean (한국어) using polite 해요체. ` +
                    `Keep medical terms accurate — you may write the Korean term followed by ` +
                    `the English term in parentheses when it aids clarity (e.g. 비만(Obesity)). ` +

                    `ANSWERING RULES: ` +
                    `1. ALWAYS search the uploaded document knowledge base first. ` +
                    `2. If retrieved document chunks contain relevant information, answer ONLY from that content. ` +
                    `Cite the document using originalFilename metadata when available ` +
                    `(e.g. "출처: 국민건강통계 2024, 23페이지"). ` +
                    `3. Say "해당 내용은 저희 서비스의 문서 범위에 포함되어 있지 않아요." ONLY when ` +
                    `the file search returns no relevant chunks at all. ` +
                    `If any retrieved chunk is even partially relevant, use it — do not fall back to general knowledge. ` +
                    `4. When you must use general knowledge because search returned nothing, prefix with ` +
                    `"다만, 일반적인 건강 정보로는 다음과 같이 안내드릴 수 있어요." ` +
                    `5. Never fabricate statistics, percentages, or citations. ` +
                    `6. Do not give medical diagnoses — recommend consulting a doctor for personal decisions.`,
                tools: [
                    {
                        fileSearch: {
                            fileSearchStoreNames: storeNames,
                            topK: 12,
                        },
                    },
                ],
            },
        });

        const grounding = response.candidates?.[0]?.groundingMetadata;
        const chunkCount = grounding?.groundingChunks?.length ?? 0;
        console.log(`[RAG] Query grounding: ${chunkCount} chunk(s) retrieved from stores ${storeNames.join(", ")}`);
        if (chunkCount === 0) {
            console.warn("[RAG] No document chunks retrieved — model will fall back to general knowledge.");
        } else {
            const titles = grounding?.groundingChunks
                ?.map((c: { retrievedContext?: { title?: string } }) => c.retrievedContext?.title)
                .filter(Boolean)
                .slice(0, 3);
            if (titles?.length) {
                console.log(`[RAG] Retrieved doc titles: ${titles.join(", ")}`);
            }
        }

        return response.text ?? "";
    }
}
