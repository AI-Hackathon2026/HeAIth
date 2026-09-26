import fs from "fs";
import path from "path";
import { UploadStorage } from "../store/blob.storage";
import { JsonStore } from "../store/json.store";

/** Page-text file written by `npm run index:documents` for each PDF in public/documents. */
export type BundledDocumentFile = {
    id: string;
    filename: string;
    /** Public URL of the PDF, e.g. /documents/<filename>. */
    url: string;
    createdAt: string;
    pages: string[];
};

export type DocumentMeta = {
    id: string;
    filename: string;
    createdAt: Date;
    source: "bundled" | "upload";
};

/** A bundled PDF is a static file at `url`; an uploaded one is served by the API. */
export type PdfLocation = { kind: "url"; url: string } | { kind: "upload" };

/** Keeps uploaded PDFs in a folder on the local disk. */
export class LocalUploadStorage implements UploadStorage {
    constructor(private readonly _dir: string) {}

    async save(name: string, body: Buffer | string) {
        fs.mkdirSync(this._dir, { recursive: true });
        fs.writeFileSync(path.join(this._dir, name), body);
    }

    async load(name: string) {
        const filePath = path.join(this._dir, name);
        return fs.existsSync(filePath) ? fs.readFileSync(filePath) : null;
    }

    async remove(name: string) {
        fs.rmSync(path.join(this._dir, name), { force: true });
    }
}

/**
 * The set of PDFs the app can read and cite. Bundled documents ship with the
 * app (PDF in public/documents, text in data/documents); uploaded documents
 * are kept in an UploadStorage (local folder or Vercel Blob) and registered in
 * the JSON store. Call prepare() before a request so their page text is cached.
 */
export class DocumentLibrary {
    private _bundled: Map<string, BundledDocumentFile> | null = null;
    private _uploadedPages = new Map<string, string[]>();

    constructor(
        private readonly _store: JsonStore,
        private readonly _bundledDir: string,
        private readonly _uploads: UploadStorage,
        /** public/documents, where the bundled PDFs themselves live. */
        private readonly _publicPdfDir: string,
    ) {}

    list(): DocumentMeta[] {
        const { uploaded, hidden } = this._store.read((db) => ({
            uploaded: db.uploadedFiles,
            hidden: db.hiddenDocumentIds,
        }));
        const bundled = [...this._loadBundled().values()]
            .filter((doc) => !hidden.includes(doc.id))
            .map((doc) => ({
                id: doc.id,
                filename: doc.filename,
                createdAt: new Date(doc.createdAt),
                source: "bundled" as const,
            }));
        return [
            ...bundled,
            ...uploaded.map((row) => ({
                id: row.id,
                filename: row.filename,
                createdAt: new Date(row.createdAt),
                source: "upload" as const,
            })),
        ];
    }

    find(id: string): DocumentMeta | null {
        return this.list().find((doc) => doc.id === id) ?? null;
    }

    /** Loads the page text of uploaded documents that are not cached in this instance yet. */
    async prepare(): Promise<void> {
        const ids = this._store.read((db) => db.uploadedFiles.map((row) => row.id));
        await Promise.all(
            ids
                .filter((id) => !this._uploadedPages.has(id))
                .map(async (id) => {
                    const raw = await this._uploads.load(pagesName(id));
                    if (raw) this._uploadedPages.set(id, JSON.parse(raw.toString("utf8")) as string[]);
                }),
        );
    }

    getPages(id: string): string[] {
        const bundled = this._loadBundled().get(id);
        if (bundled) return bundled.pages;
        return this._uploadedPages.get(id) ?? [];
    }

    getPdfLocation(id: string): PdfLocation | null {
        const bundled = this._loadBundled().get(id);
        if (bundled) return { kind: "url", url: bundled.url };
        return this.find(id) ? { kind: "upload" } : null;
    }

    /** Raw bytes of a document's PDF, or null if the file is missing. */
    async readPdf(id: string): Promise<Buffer | null> {
        const bundled = this._loadBundled().get(id);
        if (bundled) {
            const filePath = path.join(this._publicPdfDir, bundled.filename);
            return fs.existsSync(filePath) ? fs.readFileSync(filePath) : null;
        }
        return this._uploads.load(pdfName(id));
    }

    isBundled(id: string): boolean {
        return this._loadBundled().has(id);
    }

    async saveUpload(id: string, pdf: Buffer, pages: string[]) {
        await this._uploads.save(pdfName(id), pdf, "application/pdf");
        await this._uploads.save(pagesName(id), JSON.stringify(pages), "application/json");
        this._uploadedPages.set(id, pages);
    }

    async removeUpload(id: string) {
        this._uploadedPages.delete(id);
        await this._uploads.remove(pdfName(id));
        await this._uploads.remove(pagesName(id));
    }

    private _loadBundled(): Map<string, BundledDocumentFile> {
        if (this._bundled) return this._bundled;
        const docs = new Map<string, BundledDocumentFile>();
        if (fs.existsSync(this._bundledDir)) {
            for (const name of fs.readdirSync(this._bundledDir)) {
                if (!name.endsWith(".json")) continue;
                const doc = JSON.parse(
                    fs.readFileSync(path.join(this._bundledDir, name), "utf8"),
                ) as BundledDocumentFile;
                docs.set(doc.id, doc);
            }
        }
        this._bundled = docs;
        return docs;
    }
}

const pdfName = (id: string) => `${id}.pdf`;
const pagesName = (id: string) => `${id}.pages.json`;
