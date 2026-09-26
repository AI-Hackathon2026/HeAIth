import { z } from "zod";
import { BusinessException, BusinessExceptionType } from "../../../../shared/exceptions/business.exception";

export const emailSchema = z.email({
    error: (iss) => {
        if (iss.input === undefined) {
            throw new BusinessException({
                type: BusinessExceptionType.EMAIL_REQUIRE,
            });
        }
        throw new BusinessException({
            type: BusinessExceptionType.INVALID_EMAIL,
        });
    },
});


export const usernameSchema = z.string({
    error: (iss) => {
        if (iss.input === undefined) {
            throw new BusinessException({
                type: BusinessExceptionType.USERNAME_REQUIRED,
            });
        }
        throw new BusinessException({
            type: BusinessExceptionType.INVALID_USERNAME,
        });
    },
});

export const passwordSchema = z
    .string({
        error: (iss) => {
            if (iss.input === undefined) {
                throw new BusinessException({
                    type: BusinessExceptionType.PASSWORD_REQUIRED,
                });
            }
            throw new BusinessException({
                type: BusinessExceptionType.INVALID_PASSWORD,
            });
        },
    })