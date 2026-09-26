import fs from "fs";
import path from "path";
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

export type PdfLocation = { kind: "url"; url: string } | { kind: "file"; filePath: string };

/**
 * The set of PDFs the app can read and cite. Bundled documents ship with the
 * app (PDF in public/documents, text in data/documents); uploaded documents
 * are stored in the writable data directory and registered in the JSON store.
 */
export class DocumentLibrary {
    private _bundled: Map<string, BundledDocumentFile> | null = null;
    private _uploadedPages = new Map<string, string[]>();

    constructor(
        private readonly _store: JsonStore,
        private readonly _bundledDir: string,
        private readonly _uploadDir: string,
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

    getPages(id: string): string[] {
        const bundled = this._loadBundled().get(id);
        if (bundled) return bundled.pages;

        const cached = this._uploadedPages.get(id);
        if (cached) return cached;
        const pagesPath = this._uploadedPagesPath(id);
        if (!fs.existsSync(pagesPath)) return [];
        const pages = JSON.parse(fs.readFileSync(pagesPath, "utf8")) as string[];
        this._uploadedPages.set(id, pages);
        return pages;
    }

    getPdfLocation(id: string): PdfLocation | null {
        const bundled = this._loadBundled().get(id);
        if (bundled) return { kind: "url", url: bundled.url };
        const filePath = this._uploadedPdfPath(id);
        return fs.existsSync(filePath) ? { kind: "file", filePath } : null;
    }

    /** Raw bytes of a document's PDF, or null if the file is missing. */
    readPdf(id: string): Buffer | null {
        const bundled = this._loadBundled().get(id);
        const filePath = bundled
            ? path.join(this._publicPdfDir, bundled.filename)
            : this._uploadedPdfPath(id);
        return fs.existsSync(filePath) ? fs.readFileSync(filePath) : null;
    }

    isBundled(id: string): boolean {
        return this._loadBundled().has(id);
    }

    saveUpload(id: string, pdf: Buffer, pages: string[]) {
        fs.mkdirSync(this._uploadDir, { recursive: true });
        fs.writeFileSync(this._uploadedPdfPath(id), pdf);
        fs.writeFileSync(this._uploadedPagesPath(id), JSON.stringify(pages), "utf8");
        this._uploadedPages.set(id, pages);
    }

    removeUpload(id: string) {
        this._uploadedPages.delete(id);
        fs.rmSync(this._uploadedPdfPath(id), { force: true });
        fs.rmSync(this._uploadedPagesPath(id), { force: true });
    }

    private _uploadedPdfPath(id: string) {
        return path.join(this._uploadDir, `${id}.pdf`);
    }

    private _uploadedPagesPath(id: string) {
        return path.join(this._uploadDir, `${id}.pages.json`);
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
