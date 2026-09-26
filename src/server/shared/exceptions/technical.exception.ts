export enum TechnicalExceptionType {
    INTERNAL_SERVER_ERROR,
    UNIQUE_VIOLATION,
    EXTERNAL_API_INVALID_REQUEST,
    RESOURCE_NOT_FOUND,
    OPTIMISTIC_LOCK_FAILED,
    EMAIL_SEND_FAILED,
}

const TechnicalExceptionTable: Record<TechnicalExceptionType, string> = {
    [TechnicalExceptionType.RESOURCE_NOT_FOUND]: "Resource not found.",
    [TechnicalExceptionType.INTERNAL_SERVER_ERROR]:
        "An unknown server error occurred.",
    [TechnicalExceptionType.OPTIMISTIC_LOCK_FAILED]:
        "A data version conflict occurred (optimistic lock failure).",
    [TechnicalExceptionType.UNIQUE_VIOLATION]:
        "A database unique constraint violation occurred.",
    [TechnicalExceptionType.EXTERNAL_API_INVALID_REQUEST]:
        "The external API request is invalid.",
    [TechnicalExceptionType.EMAIL_SEND_FAILED]:
        "Failed to send email. Please check your email configuration.",
};

export class TechnicalException extends Error {
    public readonly type: TechnicalExceptionType;
    public readonly error?: Error;
    public readonly meta?: unknown;

    constructor(options: {
        message?: string;
        type: TechnicalExceptionType;
        error?: Error;
    }) {
        super(options.message ?? TechnicalExceptionTable[options.type]);
        this.type = options.type;
        this.error = options.error;
    }
}
