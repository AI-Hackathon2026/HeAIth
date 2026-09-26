import { BusinessException, BusinessExceptionType } from "../../../shared/exceptions/business.exception";
import { TechnicalException, TechnicalExceptionType } from "../../../shared/exceptions/technical.exception";
import { normalizeUploadedFilename } from "../../../shared/utils/filename.util";
import { extractPdfPages } from "../../../shared/utils/pdf.text";
import { IFileCommandRepo } from "../../port/repo/command/I.file.command.repo";
import { IRagStoreCommandRepo } from "../../port/repo/command/I.rag.store.command.repo";
import { IRagStoreQueryRepo } from "../../port/repo/query/I.rag.store.query.repo";
import { IUnitOfWork } from "../../port/repo/I.unit.of.work";
import { IChatbot } from "../../port/I.chatbot";
import { ContentVo } from "../entity/content.vo";
import { FileEntity } from "../entity/file.entity";

export type UploadedPdf = {
    originalname: string;
    buffer: Buffer;
};

export class FileCommandService {
    private _uow: IUnitOfWork;
    private _fileCommandRepo: IFileCommandRepo;
    private _ragStoreCommandRepo: IRagStoreCommandRepo;
    private _ragStoreQueryRepo: IRagStoreQueryRepo;
    private _ai: IChatbot;

    constructor(
        uow: IUnitOfWork,
        fileCommandRepo: IFileCommandRepo,
        ragStoreCommandRepo: IRagStoreCommandRepo,
        ragStoreQueryRepo: IRagStoreQueryRepo,
        gemini: IChatbot,
    ) {
        this._uow = uow;
        this._fileCommandRepo = fileCommandRepo;
        this._ragStoreCommandRepo = ragStoreCommandRepo;
        this._ragStoreQueryRepo = ragStoreQueryRepo;
        this._ai = gemini;
    }

    async saveFiles(files: UploadedPdf[]) {
        try {
            const fileEntities: FileEntity[] = [];
            for (const file of files) {
                const pages = await extractPdfPages(file.buffer);
                fileEntities.push(
                    new FileEntity({
                        filename: normalizeUploadedFilename(file.originalname),
                        pdf: file.buffer,
                        contentVos: pages.map(
                            (content, index) => new ContentVo({ page: index + 1, content }),
                        ),
                    }),
                );
            }

            await this._uow.do(async () => {
                await this._fileCommandRepo.createMany(fileEntities);
            });

            await this._uploadToGeminiRagStore(fileEntities).catch((err) => {
                console.error("[RAG] Gemini File Search Store upload failed:", err?.message ?? err);
            });
        } catch (error) {
            if (error instanceof TechnicalException) {
                if (error.type === TechnicalExceptionType.UNIQUE_VIOLATION) {
                    throw new BusinessException({
                        type: BusinessExceptionType.FILE_ALREADY_EXISTS,
                    });
                }
            }
            throw error;
        }
    }

    async deleteFile(id: string) {
        try {
            await this._uow.do(async () => {
                await this._fileCommandRepo.removeById(id);
            });
        } catch (error) {
            if (error instanceof TechnicalException) {
                if (error.type === TechnicalExceptionType.RESOURCE_NOT_FOUND) {
                    throw new BusinessException({
                        type: BusinessExceptionType.FILE_NOT_FOUND,
                    });
                }
            }
            throw error;
        }
    }

    async deleteRagDocument(documentName: string): Promise<void> {
        await this._ai.deleteStoreDocument(documentName);
    }

    async deleteRagStore(allGeminiStores = false): Promise<{ deletedStores: string[] }> {
        const deletedStores: string[] = [];

        if (allGeminiStores) {
            const stores = await this._ai.listFileSearchStores();
            for (const store of stores) {
                if (!store.name) continue;
                await this._ai.deleteFileSearchStore(store.name);
                deletedStores.push(store.name);
            }
            await this._ragStoreCommandRepo.deleteAll();
            return { deletedStores };
        }

        const storeName = await this._ragStoreQueryRepo.findGlobalStore();
        if (!storeName) {
            throw new BusinessException({ type: BusinessExceptionType.FILE_NOT_FOUND });
        }

        await this._ai.deleteFileSearchStore(storeName);
        await this._ragStoreCommandRepo.deleteByStoreName(storeName);
        deletedStores.push(storeName);

        return { deletedStores };
    }

    private async _uploadToGeminiRagStore(files: FileEntity[]): Promise<void> {
        if (!this._ai.isConfigured() || files.length === 0) return;

        let storeName = await this._ragStoreQueryRepo.findGlobalStore();
        if (!storeName) {
            storeName = await this._ai.createFileSearchStore("global-pdf-store");
            await this._ragStoreCommandRepo.save(storeName, "global-pdf-store");
        }
        const storeNameFinal = storeName;
        await Promise.all(
            files
                .filter((file) => file.pdf)
                .map((file) => this._ai.uploadPdfToStore(file.pdf!, file.filename, storeNameFinal)),
        );
    }
}
