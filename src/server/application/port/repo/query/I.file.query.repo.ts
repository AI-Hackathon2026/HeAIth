import { ContentSnippetView } from "../../../query/view/content.snippet.view";
import { FileListView } from "../../../query/view/file.list.view";
import { FileVersionView } from "../../../query/view/file.version.view";
import { FileView } from "../../../query/view/file.view";

export interface IFileQueryRepo {
    // 파일 id로 파일 내용 조회(캐싱 ㄱㄱ)
    findById(id: string): Promise<FileView>;

    // 파일 이름으로 모든 파일 버전 조회
    findByName(filename: string): Promise<FileVersionView[]>;

    // 키워드로 파일 이름, 페이지 조회
    findByKeyword(keyword: string): Promise<FileListView[]>;

    // RAG: user query → relevant page snippets (Korean text from DB)
    findRelevantSnippets(
        searchTerms: string[],
        maxPages: number,
        primaryTopic?: string | null,
    ): Promise<ContentSnippetView[]>;

    // 모든 파일 조회
    findAll(): Promise<FileListView[]>;
}