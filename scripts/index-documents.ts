/**
 * Extracts per-page text from every PDF in public/documents and writes it to
 * data/documents/<name>.json. The API reads these files for RAG snippets and
 * keyword search, so run this after adding or replacing a bundled PDF:
 *
 *   npm run index:documents
 */
import fs from "fs";
import path from "path";
import type { BundledDocumentFile } from "../src/server/outbound/documents/document.library";
import { documentIdFromFilename, extractPdfPages } from "../src/server/shared/utils/pdf.text";

const root = path.resolve(__dirname, "..");
const pdfDir = path.join(root, "public", "documents");
const outDir = path.join(root, "data", "documents");

async function main() {
    fs.mkdirSync(outDir, { recursive: true });
    const pdfs = fs.readdirSync(pdfDir).filter((name) => name.toLowerCase().endsWith(".pdf"));
    const expected = new Set<string>();

    for (const filename of pdfs) {
        const outName = `${path.parse(filename).name}.json`;
        expected.add(outName);
        const pdfPath = path.join(pdfDir, filename);
        const outPath = path.join(outDir, outName);

        if (fs.existsSync(outPath) && fs.statSync(outPath).mtimeMs >= fs.statSync(pdfPath).mtimeMs) {
            console.log(`= ${filename} (up to date)`);
            continue;
        }

        const started = Date.now();
        const pages = await extractPdfPages(fs.readFileSync(pdfPath));
        const doc: BundledDocumentFile = {
            id: documentIdFromFilename(filename),
            filename,
            url: `/documents/${encodeURIComponent(filename)}`,
            createdAt: fs.statSync(pdfPath).mtime.toISOString(),
            pages,
        };
        fs.writeFileSync(outPath, JSON.stringify(doc), "utf8");
        console.log(`+ ${filename}: ${pages.length} pages in ${((Date.now() - started) / 1000).toFixed(1)}s`);
    }

    for (const name of fs.readdirSync(outDir)) {
        if (name.endsWith(".json") && !expected.has(name)) {
            fs.rmSync(path.join(outDir, name));
            console.log(`- ${name} (PDF removed)`);
        }
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
