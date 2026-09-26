import { IUserQueryRepo } from "../../port/repo/query/I.user.query.repo";
import { IHashManager } from "../../port/managers/I.hash.manager";
import { BusinessException, BusinessExceptionType } from "../../../shared/exceptions/business.exception";
import { TechnicalException, TechnicalExceptionType } from "../../../shared/exceptions/technical.exception";

export class UserQueryService {
    private userQueryRepo: IUserQueryRepo;
    private hashManager: IHashManager;

    constructor(userQueryRepo: IUserQueryRepo, hashManager: IHashManager) {
        this.userQueryRepo = userQueryRepo;
        this.hashManager = hashManager;
    }

    getUsers = async () => {
        try {
            const users = await this.userQueryRepo.findAll();
            return users;
        } catch (error) {
            throw error;
        }

    }


    getUserByEmail = async (email: string) => {
        try {
            const user = await this.userQueryRepo.findByEmail(email);
            if (!user) {
                throw new BusinessException({
                    type: BusinessExceptionType.USER_NOT_FOUND,
                });
            }
            return user;
        } catch (error) {
            if (error instanceof TechnicalException) {
                if (error.type == TechnicalExceptionType.RESOURCE_NOT_FOUND) {
                    throw new BusinessException({
                        type: BusinessExceptionType.USER_NOT_FOUND,
                    });
                }
            }
            throw error;
        }
    }
}