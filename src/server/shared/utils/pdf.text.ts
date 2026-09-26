import crypto from "crypto";
import { extractText, getDocumentProxy } from "unpdf";

/** Same clean-up the old pdf-ts pipeline applied: joins vertically split Korean glyphs and collapses whitespace. */
function fixVerticalText(text: string): string {
    return text
        .replace(/\n/g, "")
        .replace(/\s{2,}/g, " ")
        .replace(/([가-힣]) ([가-힣])/g, "$1$2");
}

/** Extracts one cleaned text string per PDF page (index 0 = page 1). */
export async function extractPdfPages(buffer: Uint8Array): Promise<string[]> {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: false });
    return text.map(fixVerticalText);
}

/** Deterministic UUID-shaped id for a bundled document, derived from its filename. */
export function documentIdFromFilename(filename: string): string {
    const hex = crypto.createHash("sha1").update(`heaith-document:${filename}`).digest("hex");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
