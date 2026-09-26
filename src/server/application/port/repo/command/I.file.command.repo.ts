import { FileEntity } from "../../../command/entity/file.entity";

export type FileSummary = {
    id: string;
    filename: string;
};

export interface IFileCommandRepo {
    createMany(files: FileEntity[]): Promise<void>;
    removeById(id: string): Promise<void>;
    findSummaryById(id: string): Promise<FileSummary | null>;
    updateFilename(id: string, filename: string): Promise<void>;
}
