export class ContentVo {
    page: number;
    content: string;
    constructor({
        page,
        content
    }: {
        page: number,
        content: string
    }) {
        this.page = page;
        this.content = content;
    }
}