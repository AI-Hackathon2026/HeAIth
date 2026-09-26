import z from "zod";
import {
    BusinessException,
    BusinessExceptionType,
} from "../../shared/exceptions/business.exception";

export const validate = <T extends z.ZodType>(schema: T, data: unknown) => {
    const parsedData = schema.safeParse(data);
    if (!parsedData.success) {
        const firstIssue = parsedData.error.issues[0];
        const issuePath = firstIssue.path.length ? firstIssue.path.join(".") : "body";
        throw new BusinessException({
            type: BusinessExceptionType.PARSE_BODY_ERROR,
            message: `${issuePath}: ${firstIssue.message}`,
        });
    }

    return parsedData.data;
};
