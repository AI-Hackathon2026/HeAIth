import { BusinessException, BusinessExceptionType } from "../../../shared/exceptions/business.exception";
import { Role } from "@/server/shared/types/enums";
import { IAI } from "../../port/I.ai.model";
import { ChatCommandService } from "./chat.command.service";
import { CreateMessageDto } from "../../../Inbound/controller/_communication/request/message.request";
import { GeminiVersion } from "../../../outbound/chatbot/gemini";
import { IUnitOfWork } from "../../port/repo/I.unit.of.work";
import { IRagStoreQueryRepo } from "../../port/repo/query/I.rag.store.query.repo";
import { IFileQueryRepo } from "../../port/repo/query/I.file.query.repo";
import { expandSearchTerms, extractPrimaryTopic } from "../../../shared/utils/rag.search.util";

export class ChatbotCommandService {
    private ai: IAI;
    private uow: IUnitOfWork;
    private chatCommandService: ChatCommandService;
    private ragStoreQueryRepo: IRagStoreQueryRepo;
    private fileQueryRepo: IFileQueryRepo;

    constructor(
        ai: IAI,
        uow: IUnitOfWork,
        chatCommandService: ChatCommandService,
        ragStoreQueryRepo: IRagStoreQueryRepo,
        fileQueryRepo: IFileQueryRepo,
    ) {
        this.ai = ai;
        this.uow = uow;
        this.chatCommandService = chatCommandService;
        this.ragStoreQueryRepo = ragStoreQueryRepo;
        this.fileQueryRepo = fileQueryRepo;
    }

    async sendMessage(dto: CreateMessageDto) {
        try {
            const { chatId, text } = dto;
            const searchTerms = expandSearchTerms(text);
            const primaryTopic = extractPrimaryTopic(text);
            const snippets = await this.fileQueryRepo.findRelevantSnippets(searchTerms, 6, primaryTopic);

            let response: string;
            if (snippets.length > 0) {
                response = await this.ai.gemini.sendTextWithDocumentContext(text, snippets);
            } else {
                const storeName = await this.ragStoreQueryRepo.findGlobalStore();
                const raw = storeName
                    ? await this.ai.gemini.sendTextWithFileSearch(text, [storeName])
                    : await this.ai.gemini.sendText(text);
                response = raw ?? "";
            }

            // Only DB writes go inside the transaction
            await this.uow.do(async () => {
                await this.chatCommandService.saveChatMessage({
                    chatId,
                    text,
                    role: Role.USER,
                });
                await this.chatCommandService.saveChatMessage({
                    chatId,
                    text: response,
                    role: Role.AI,
                });
            }, {
                transactionOptions: {
                    useTransaction: true,
                    isolationLevel: "ReadCommitted",
                },
                useOptimisticLock: true,
            });

            return response;
        } catch (error) {
            const code = (error as any)?.error?.code || (error as any)?.code || (error as any)?.status;

            if (code == 429) {
                throw new BusinessException({
                    type: BusinessExceptionType.RATE_LIMIT_EXCEEDED,
                });
            } else if (code == 404) {
                throw new BusinessException({
                    type: BusinessExceptionType.MODEL_NOT_AVAILABLE,
                });
            } else if (code == 503) {
                throw new BusinessException({
                    type: BusinessExceptionType.MODEL_HIGH_IN_DEMAND,
                });
            }

            throw error;
        }
    }

    async getEmbedding(text: string) {
        try {
            const response = await this.ai.gemini.embedText(text);
            if (!response) {
                throw new BusinessException({
                    type: BusinessExceptionType.AI_RESPONSE_EMPTY,
                });
            }
            return response;
        } catch (error) {
            throw error;
        }
    }

    async showAvailableModels() {
        try {
            const models = await this.ai.gemini.getAvailableModels();
            return models;
        } catch (error) {
            throw error;
        }
    }

    async changeModel(model: GeminiVersion) {
        try {
            const models = await this.ai.gemini.getAvailableModels();
            if (!models.includes(model)) {
                throw new BusinessException({
                    type: BusinessExceptionType.MODEL_NOT_AVAILABLE,
                });
            }
            await this.ai.gemini.changeModel(model);
        } catch (error) {
            throw error;
        }
    }

    async getCurrentModel() {
        try {
            const model = await this.ai.gemini.getModelName();
            return model;
        } catch (error) {
            throw error;
        }
    }
}
