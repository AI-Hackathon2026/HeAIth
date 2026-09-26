export interface IEmailUtil {
    sendEmail(params: {
        to: string;
        subject: string;
        text: string;
        /** When set, sent as multipart/alternative with `text` as fallback. */
        html?: string;
    }): Promise<void>;
}
