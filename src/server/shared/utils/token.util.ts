import jwt, { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import crypto from "crypto";
import {
    BusinessException,
    BusinessExceptionType,
} from "../exceptions/business.exception";
import { IConfigUtil } from "./config.util";

export type TokenPayload = {
    userId: string;
    role: string;
    exp: number;
};

export interface ITokenUtil {
    generateAccessToken(payload: Omit<TokenPayload, "exp">): string;

    generateRefreshToken(payload: Omit<TokenPayload, "exp">): string;

    generateCsrfValue(): string;

    /**
     * ignoreExpiration이 false이고 토큰이 만료된 경우 예외를 던집니다.
     * @throws {BusinessException}
     */
    verifyToken(params: {
        token: string;
        ignoreExpiration?: boolean;
    }): TokenPayload;
}

export class TokenUtil implements ITokenUtil {
    constructor(private _config: IConfigUtil) { }

    generateAccessToken(payload: TokenPayload) {
        return jwt.sign(payload, this._config.parsed().TOKEN_SECRET, {
            expiresIn: this._config.parsed().ACCESS_TOKEN_EXPIRES_IN,
        });
    }
    generateRefreshToken(payload: TokenPayload) {
        return jwt.sign(payload, this._config.parsed().TOKEN_SECRET, {
            expiresIn: this._config.parsed().REFRESH_TOKEN_EXPIRES_IN,
        });
    }
    generateCsrfValue() {
        return crypto.randomBytes(16).toString("hex");
    }
    verifyToken(params: { token: string; ignoreExpiration?: boolean }) {
        try {
            const { token, ignoreExpiration } = params;
            return jwt.verify(token, this._config.parsed().TOKEN_SECRET, {
                ignoreExpiration,
            }) as TokenPayload;
        } catch (err) {
            if (err instanceof TokenExpiredError) {
                throw new BusinessException({
                    type: BusinessExceptionType.TOKEN_EXPIRED,
                });
            }
            if (err instanceof JsonWebTokenError) {
                throw new BusinessException({
                    type: BusinessExceptionType.NOT_LOGGED_IN,
                });
            }

            throw err;
        }
    }
}

