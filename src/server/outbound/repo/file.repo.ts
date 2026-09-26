import { FileEntity } from "../../application/command/entity/file.entity";
import { FileSummary, IFileCommandRepo } from "../../application/port/repo/command/I.file.command.repo";
import { IRagStoreCommandRepo } from "../../application/port/repo/command/I.rag.store.command.repo";
import { IFileQueryRepo } from "../../application/port/repo/query/I.file.query.repo";
import { IRagStoreQueryRepo, RagStoreRecord } from "../../application/port/repo/query/I.rag.store.query.repo";
import { ContentSnippetView } from "../../application/query/view/content.snippet.view";
import { FileListView } from "../../application/query/view/file.list.view";
import { FileVersionView } from "../../application/query/view/file.version.view";
import { FileView } from "../../application/query/view/file.view";
import {
    TechnicalException,
    TechnicalExceptionType,
} from "../../shared/exceptions/technical.exception";
import { rankSnippets } from "../../shared/utils/rag.search.util";
import { DocumentLibrary } from "../documents/document.library";
import { JsonStore, newId, nowIso } from "../store/json.store";

const notFound = () => new TechnicalException({ type: TechnicalExceptionType.RESOURCE_NOT_FOUND });

export class FileCommandRepo implements IFileCommandRepo {
    constructor(
        private readonly store: JsonStore,
        private readonly library: DocumentLibrary,
    ) {}

    /**
     * Registers uploaded PDFs. Each entity must carry its raw bytes in `pdf`;
     * the page text comes from its content value objects.
     */
    async createMany(files: FileEntity[]): Promise<void> {
        const taken = new Set(this.library.list().map((doc) => doc.filename));
        for (const file of files) {
            if (taken.has(file.filename)) {
                throw new TechnicalException({ type: TechnicalExceptionType.UNIQUE_VIOLATION });
            }
            taken.add(file.filename);
        }

        for (const file of files) {
            const id = newId();
            const pages = [...file.contentVos].sort((a, b) => a.page - b.page).map((vo) => vo.content);
            await this.library.saveUpload(id, file.pdf ?? Buffer.alloc(0), pages);
            this.store.write((db) => {
                const now = nowIso();
                db.uploadedFiles.push({ id, filename: file.filename, createdAt: now, updatedAt: now });
            });
        }
    }

    async removeById(id: string): Promise<void> {
        const doc = this.library.find(id);
        if (!doc) throw notFound();

        if (doc.source === "bundled") {
            // Bundled PDFs are part of the deployment; hide them instead of deleting.
            this.store.write((db) => {
                db.hiddenDocumentIds.push(id);
            });
            return;
        }

        this.store.write((db) => {
            db.uploadedFiles = db.uploadedFiles.filter((f) => f.id !== id);
        });
        await this.library.removeUpload(id);
    }

    async findSummaryById(id: string): Promise<FileSummary | null> {
        const doc = this.library.find(id);
        return doc ? { id: doc.id, filename: doc.filename } : null;
    }

    async updateFilename(id: string, filename: string): Promise<void> {
        this.store.write((db) => {
            const row = db.uploadedFiles.find((f) => f.id === id);
            if (!row) throw notFound();
            if (db.uploadedFiles.some((f) => f.id !== id && f.filename === filename)) {
                throw new TechnicalException({ type: TechnicalExceptionType.UNIQUE_VIOLATION });
            }
            row.filename = filename;
            row.updatedAt = nowIso();
        });
    }
}

export class FileQueryRepo implements IFileQueryRepo {
    constructor(private readonly library: DocumentLibrary) {}

    findById = async (id: string): Promise<FileView> => {
        const doc = this.library.find(id);
        if (!doc) throw notFound();
        return {
            id: doc.id,
            filename: doc.filename,
            content: this.library.getPages(id),
            createdAt: doc.createdAt,
        };
    };

    findByName = async (filename: string): Promise<FileVersionView[]> => {
        const needle = filename.toLowerCase();
        return this.library
            .list()
            .filter((doc) => doc.filename.toLowerCase().includes(needle))
            .map(({ id, filename, createdAt }) => ({ id, filename, createdAt }));
    };

    findByKeyword = async (keyword: string): Promise<FileListView[]> => {
        const needle = keyword.toLowerCase();
        return this.library
            .list()
            .map((doc) => ({
                doc,
                matches: this.library
                    .getPages(doc.id)
                    .map((content, index) => ({ page: index + 1, content }))
                    .filter((page) => page.content.toLowerCase().includes(needle)),
            }))
            .filter(({ matches }) => matches.length > 0)
            .map(({ doc, matches }) => ({
                id: doc.id,
                filename: doc.filename,
                createdAt: doc.createdAt,
                content: matches,
            }));
    };

    findRelevantSnippets = async (
        searchTerms: string[],
        maxPages: number,
        primaryTopic: string | null = null,
    ): Promise<ContentSnippetView[]> => {
        if (searchTerms.length === 0) return [];
        const needles = searchTerms.map((term) => term.toLowerCase());

        const rows = this.library.list().flatMap((doc) =>
            this.library
                .getPages(doc.id)
                .map((content, index) => ({ filename: doc.filename, page: index + 1, content }))
                .filter(({ content }) => {
                    const haystack = content.toLowerCase();
                    return needles.some((needle) => haystack.includes(needle));
                }),
        );

        return rankSnippets(rows, searchTerms, primaryTopic, maxPages).map((row) => ({
            filename: row.filename,
            page: row.page,
            content: row.content.slice(0, 2500),
        }));
    };

    findAll = async (): Promise<FileListView[]> =>
        this.library.list().map(({ id, filename, createdAt }) => ({ id, filename, createdAt }));
}

export class RagStoreCommandRepo implements IRagStoreCommandRepo {
    constructor(private readonly store: JsonStore) {}

    async save(storeName: string, displayName: string): Promise<void> {
        this.store.write((db) => {
            if (db.ragStores.some((s) => s.storeName === storeName)) {
                throw new TechnicalException({ type: TechnicalExceptionType.UNIQUE_VIOLATION });
            }
            db.ragStores.push({ id: newId(), storeName, displayName, createdAt: nowIso() });
        });
    }

    async deleteByStoreName(storeName: string): Promise<void> {
        this.store.write((db) => {
            db.ragStores = db.ragStores.filter((s) => s.storeName !== storeName);
        });
    }

    async deleteAll(): Promise<void> {
        this.store.write((db) => {
            db.ragStores = [];
        });
    }
}

export class RagStoreQueryRepo implements IRagStoreQueryRepo {
    constructor(private readonly store: JsonStore) {}

    async findGlobalStore(): Promise<string | null> {
        return (await this.findGlobalStoreRecord())?.storeName ?? null;
    }

    async findGlobalStoreRecord(): Promise<RagStoreRecord | null> {
        const store = this.store.read(
            (db) => [...db.ragStores].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0] ?? null,
        );
        if (!store) return null;
        return {
            storeName: store.storeName,
            displayName: store.displayName,
            createdAt: new Date(store.createdAt),
        };
    }
}
