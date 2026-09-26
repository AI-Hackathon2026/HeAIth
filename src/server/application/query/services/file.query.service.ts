import { BusinessException, BusinessExceptionType } from "../../../shared/exceptions/business.exception";
import { TechnicalException, TechnicalExceptionType } from "../../../shared/exceptions/technical.exception";
import { IFileQueryRepo } from "../../port/repo/query/I.file.query.repo";
import { FileListView } from "../view/file.list.view";
import { FileVersionView } from "../view/file.version.view";
import { FileView } from "../view/file.view";

export class FileQueryService {
    private fileQueryRepo: IFileQueryRepo;

    constructor(
        fileQueryRepo: IFileQueryRepo
    ) {
        this.fileQueryRepo = fileQueryRepo;
    }

    // 파일 id로 파일 내용 조회(캐싱 ㄱㄱ)
    getFile = async (id: string): Promise<FileView> => {
        try {
            const file = await this.fileQueryRepo.findById(id);
            return file;
        } catch (error) {
            if (error instanceof TechnicalException) {
                if (error.type === TechnicalExceptionType.RESOURCE_NOT_FOUND) {
                    throw new BusinessException({
                        type: BusinessExceptionType.FILE_NOT_FOUND
                    });
                }
            }
            throw error;
        }
    }

    // 파일 이름으로 모든 파일 버전 조회
    getFilesByName = async (filename: string): Promise<FileVersionView[]> => {
        try {
            const files = await this.fileQueryRepo.findByName(filename);

            if (!files || files.length === 0) {
                throw new BusinessException({
                    type: BusinessExceptionType.FILE_NOT_FOUND
                });
            }

            return files;
        } catch (error) {
            if (error instanceof TechnicalException) {
                if (error.type === TechnicalExceptionType.RESOURCE_NOT_FOUND) {
                    throw new BusinessException({
                        type: BusinessExceptionType.FILE_NOT_FOUND
                    });
                }
            }
            throw error;
        }
    };

    // 키워드로 파일 이름, 페이지 조회
    searchFiles = async (keyword: string): Promise<FileListView[]> => {
        try {
            const files = await this.fileQueryRepo.findByKeyword(keyword);
            if (!files || files.length === 0) {
                throw new BusinessException({
                    type: BusinessExceptionType.FILE_NOT_FOUND
                });
            }
            return files;
        } catch (error) {
            if (error instanceof TechnicalException) {
                if (error.type === TechnicalExceptionType.RESOURCE_NOT_FOUND) {
                    throw new BusinessException({
                        type: BusinessExceptionType.FILE_NOT_FOUND
                    });
                }
            }
            throw error;
        }
    };

    getAllFiles = async (): Promise<FileListView[]> => {
        try {
            const files = await this.fileQueryRepo.findAll();
            return files;
        } catch (error) {
            if (error instanceof TechnicalException) {
                if (error.type === TechnicalExceptionType.RESOURCE_NOT_FOUND) {
                    throw new BusinessException({
                        type: BusinessExceptionType.FILE_NOT_FOUND
                    });
                }
            }
            throw error;
        }
    }
}