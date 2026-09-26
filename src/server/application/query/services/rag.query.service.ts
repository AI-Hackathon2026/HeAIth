import { IChatbot } from "../../port/I.chatbot";
import { IRagStoreQueryRepo } from "../../port/repo/query/I.rag.store.query.repo";
import { RagDocumentView, RagStoreView } from "../view/rag.document.view";
import { BusinessException, BusinessExceptionType } from "../../../shared/exceptions/business.exception";

export class RagQueryService {
    constructor(
        private readonly ragStoreQueryRepo: IRagStoreQueryRepo,
        private readonly gemini: IChatbot,
    ) {}

    async getStore(): Promise<RagStoreView | null> {
        const store = await this.ragStoreQueryRepo.findGlobalStoreRecord();
        return store;
    }

    async getDocuments(): Promise<RagDocumentView[]> {
        const store = await this.ragStoreQueryRepo.findGlobalStoreRecord();
        if (!store) {
            return [];
        }
        return await this.gemini.listStoreDocuments(store.storeName);
    }
}
