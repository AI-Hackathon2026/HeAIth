export enum BusinessExceptionType {
    // User
    EMAIL_DUPLICATE,
    EMAIL_REQUIRE,
    USER_NOT_FOUND,
    NICKNAME_TOO_LONG,
    NICKNAME_ALREADY_EXISTS,
    INVALID_EMAIL,
    INVALID_PASSWORD,
    USER_NOT_VERIFIED,
    USERNAME_REQUIRED,
    INVALID_USERNAME,

    // File
    FILE_ALREADY_EXISTS,
    FILE_NOT_FOUND,


    // Note
    NOTE_NOT_FOUND,

    // Auth
    NOT_LOGGED_IN,
    TOKEN_EXPIRED,
    UNKOWN_SERVER_ERROR,
    PASSWORD_REQUIRED,
    PASSWORD_TOO_SHORT,
    UNAUTORIZED_REQUEST,
    PARSE_BODY_ERROR,
    INVALID_AUTH,

    // Message not found
    MESSAGE_NOT_FOUND,

    // Gemini
    RATE_LIMIT_EXCEEDED,
    MODEL_NOT_AVAILABLE,
    MODEL_HIGH_IN_DEMAND,
    AI_RESPONSE_EMPTY,
    AI_NOT_CONFIGURED,

    // Health / Routine
    HEALTH_STATUS_NOT_FOUND,
    HEALTH_RECORD_NOT_FOUND,
    ROUTINE_NOT_FOUND,
    ROUTINE_TASK_NOT_FOUND,
    ROUTINE_GENERATION_FAILED,
    INVALID_HERO_STYLE,
}

const BusinessExceptionTable: Record<
    BusinessExceptionType,
    { statusCode: number; message: string }
> = {
    // User
    [BusinessExceptionType.USERNAME_REQUIRED]: {
        statusCode: 400,
        message: "Please enter a username."
    },
    [BusinessExceptionType.INVALID_USERNAME]: {
        statusCode: 400,
        message: "Invalid username format."
    },

    [BusinessExceptionType.EMAIL_DUPLICATE]: {
        statusCode: 409,
        message: "Account with this email already exists.",
    },
    [BusinessExceptionType.EMAIL_REQUIRE]: {
        statusCode: 400,
        message: "Please enter an email.",
    },
    [BusinessExceptionType.USER_NOT_FOUND]: {
        statusCode: 404,
        message: "User does not exist. Please sign up first.",
    },
    [BusinessExceptionType.NICKNAME_TOO_LONG]: {
        statusCode: 400,
        message: "Nickname can be up to 20 characters long.",
    },
    [BusinessExceptionType.NICKNAME_ALREADY_EXISTS]: {
        statusCode: 401,
        message: "Nickname already exists.",
    },
    [BusinessExceptionType.INVALID_EMAIL]: {
        statusCode: 400,
        message: "Invalid email format.",
    },
    [BusinessExceptionType.INVALID_PASSWORD]: {
        statusCode: 401,
        message: "Password does not match.",
    },
    [BusinessExceptionType.USER_NOT_VERIFIED]: {
        statusCode: 401,
        message: "User is not verified. Please wait for approval.",
    },

    // File
    [BusinessExceptionType.FILE_ALREADY_EXISTS]: {
        statusCode: 409,
        message: "File already exists.",
    },
    [BusinessExceptionType.FILE_NOT_FOUND]: {
        statusCode: 404,
        message: "File not found.",
    },


    // Note
    [BusinessExceptionType.NOTE_NOT_FOUND]: {
        statusCode: 404,
        message: "Note not found.",
    },
    [BusinessExceptionType.MESSAGE_NOT_FOUND]: {
        statusCode: 404,
        message: "Message not found.",
    },


    // Auth
    [BusinessExceptionType.TOKEN_EXPIRED]: {
        statusCode: 401,
        message: "Token has expired.",
    },
    [BusinessExceptionType.UNKOWN_SERVER_ERROR]: {
        statusCode: 500,
        message: "Unknown server error.",
    },
    [BusinessExceptionType.PASSWORD_REQUIRED]: {
        statusCode: 400,
        message: "Please enter a password.",
    },
    [BusinessExceptionType.PASSWORD_TOO_SHORT]: {
        statusCode: 400,
        message: "Password must be at least 8 characters long.",
    },
    [BusinessExceptionType.INVALID_AUTH]: {
        statusCode: 400,
        message: "Email or password is incorrect.",
    },
    [BusinessExceptionType.UNAUTORIZED_REQUEST]: {
        statusCode: 400,
        message: "Admin permission is required.",
    },
    [BusinessExceptionType.PARSE_BODY_ERROR]: {
        statusCode: 400,
        message: "Failed to parse the request body.",
    },
    [BusinessExceptionType.NOT_LOGGED_IN]: {
        statusCode: 401,
        message: "Please log in to continue.",
    },

    [BusinessExceptionType.RATE_LIMIT_EXCEEDED]: {
        statusCode: 429,
        message: "Rate limit exceeded. Please try again later.",
    },
    [BusinessExceptionType.MODEL_NOT_AVAILABLE]: {
        statusCode: 404,
        message: "Model not available.",
    },
    [BusinessExceptionType.MODEL_HIGH_IN_DEMAND]: {
        statusCode: 503,
        message: "Model is currently unavailable due to high demand.",
    },
    [BusinessExceptionType.AI_NOT_CONFIGURED]: {
        statusCode: 503,
        message: "AI features are unavailable: GEMINI_API_KEY is not configured on the server.",
    },
    [BusinessExceptionType.AI_RESPONSE_EMPTY]: {
        statusCode: 500,
        message: "AI response is empty.",
    },

    [BusinessExceptionType.HEALTH_STATUS_NOT_FOUND]: {
        statusCode: 404,
        message: "Health status not found. Please register your health profile first.",
    },
    [BusinessExceptionType.HEALTH_RECORD_NOT_FOUND]: {
        statusCode: 404,
        message: "Health record not found.",
    },
    [BusinessExceptionType.ROUTINE_NOT_FOUND]: {
        statusCode: 404,
        message: "Routine not found.",
    },
    [BusinessExceptionType.ROUTINE_TASK_NOT_FOUND]: {
        statusCode: 404,
        message: "Routine task not found.",
    },
    [BusinessExceptionType.ROUTINE_GENERATION_FAILED]: {
        statusCode: 502,
        message: "Failed to generate routine. Please try again.",
    },
    [BusinessExceptionType.INVALID_HERO_STYLE]: {
        statusCode: 400,
        message: "heroStyle must be one of IRON, DARK, or SPIDER.",
    },
};

export class BusinessException extends Error {
    public readonly statusCode: number;
    public readonly type: BusinessExceptionType;
    public readonly error?: Error;

    constructor(options: {
        message?: string;
        type: BusinessExceptionType;
        error?: Error;
    }) {
        super(options.message ?? BusinessExceptionTable[options.type].message);
        this.statusCode = BusinessExceptionTable[options.type].statusCode;
        this.type = options.type;
        this.error = options.error;
    }
}
