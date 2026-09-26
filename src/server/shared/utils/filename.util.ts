import { Readable } from "stream";

const LATIN1_MOJIBAKE_PATTERN = /[ÃÂÌÍÐÑÒÓÔÕÖØÙÚÛÜÝÞßà-áãäåæçè-éêëì-ïðñò-öøù-üýþÿ]/;

export const normalizeUploadedFilename = (originalname: string) => {
    const recovered = recoverUtf8Filename(originalname).trim();
    const fallback = originalname.trim();
    return recovered || fallback || "file.pdf";
};

export const buildStoredFilename = (originalname: string) => {
    return normalizeUploadedFilename(originalname);
};

/** Gemini SDK sends filenames as HTTP ByteString (0–255 only). */
export const toAsciiSafeFilename = (filename: string) =>
    filename
        .replace(/[^\x20-\x7E]/g, "_")
        .replace(/\s+/g, "_")
        .replace(/["\\]/g, "_") || "file.pdf";

export const buildContentDisposition = (
    filename: string,
    disposition: "inline" | "attachment" = "inline",
) => {
    const asciiFallback = filename.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
    const encoded = encodeURIComponent(filename);
    return `${disposition}; filename="${asciiFallback || "file.pdf"}"; filename*=UTF-8''${encoded}`;
};

export const buildInlineContentDisposition = (filename: string) =>
    buildContentDisposition(filename, "inline");

export const buildAttachmentContentDisposition = (filename: string) =>
    buildContentDisposition(filename, "attachment");

const recoverUtf8Filename = (value: string) => {
    if (!LATIN1_MOJIBAKE_PATTERN.test(value)) {
        return value;
    }

    const recovered = Buffer.from(value, "latin1").toString("utf8");
    return recovered.includes("\uFFFD") ? value : recovered;
};


export const toReadableStream = (body: any): Readable => {
    if (body instanceof Readable) {
        return body;
    }
    if (body?.transformToWebStream) {
        return Readable.fromWeb(body.transformToWebStream());
    }
    if (body?.arrayBuffer) {
        return Readable.from(
            body.arrayBuffer().then((arrayBuffer: ArrayBuffer) => Buffer.from(arrayBuffer))
        );
    }
    if (body instanceof Uint8Array) {
        return Readable.from(Buffer.from(body));
    }
    throw new Error("Unsupported S3 Body type");
};
