import { ContentVo } from "./content.vo";

export class FileEntity {
    filename: string;
    contentVos: ContentVo[];
    /** Raw PDF bytes, kept so the file can be stored alongside its text. */
    pdf?: Buffer;

    constructor({
        filename,
        contentVos,
        pdf,
    }: {
        filename: string;
        contentVos: ContentVo[];
        pdf?: Buffer;
    }) {
        this.filename = filename;
        this.contentVos = contentVos;
        this.pdf = pdf;
    }
}
