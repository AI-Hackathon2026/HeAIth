import { ApiRequest } from "../http/router";
import {
    BusinessException,
    BusinessExceptionType,
} from "../../shared/exceptions/business.exception";
import { ITokenUtil } from "../../shared/utils/token.util";
import { Role } from "../../shared/types/enums";

export class AuthMiddleware {
    constructor(private readonly _tokenUtil: ITokenUtil) {}

    checkAuth = (req: ApiRequest) => {
        const accessToken = req.cookies["accessToken"];
        if (!accessToken) {
            throw new BusinessException({ type: BusinessExceptionType.NOT_LOGGED_IN });
        }

        const payload = this._tokenUtil.verifyToken({ token: accessToken });
        req.userId = payload.userId;
        req.role = payload.role;
    };

    isAdmin = (req: ApiRequest) => {
        this.checkAuth(req);
        if (req.role !== Role.ADMIN) {
            throw new BusinessException({ type: BusinessExceptionType.UNAUTORIZED_REQUEST });
        }
    };
}
