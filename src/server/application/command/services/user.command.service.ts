import { CreateUserDto } from "../../../Inbound/controller/_communication/request/user.request";
import { BusinessException, BusinessExceptionType } from "../../../shared/exceptions/business.exception";
import { TechnicalException, TechnicalExceptionType } from "../../../shared/exceptions/technical.exception";
import { IHashManager } from "../../port/managers/I.hash.manager";
import { IUserCommandRepo } from "../../port/repo/command/I.user.command.repo";
import { IUnitOfWork } from "../../port/repo/I.unit.of.work";
import { UserEntity } from "../entity/user.entity";

export class UserCommandService {
    private uow: IUnitOfWork;
    private hashManager: IHashManager;
    private userCommandRepo: IUserCommandRepo;

    constructor(
        uow: IUnitOfWork,
        hashManager: IHashManager,
        userCommandRepo: IUserCommandRepo,
    ) {
        this.uow = uow;
        this.hashManager = hashManager;
        this.userCommandRepo = userCommandRepo;
    }

    async createUser(dto: CreateUserDto) {
        try {
            const { email, username, password, role } = dto;
            const user = await UserEntity.createNew({
                email,
                username,
                password,
                role,
                hashManager: this.hashManager
            })

            await this.userCommandRepo.create(user);
        } catch (err) {
            if (err instanceof TechnicalException) {
                if (err.type === TechnicalExceptionType.UNIQUE_VIOLATION) {
                    throw new BusinessException({
                        type: BusinessExceptionType.EMAIL_DUPLICATE
                    });
                }
            }
            throw err;
        }
    }

    async deleteUser(userId: string) {
        try {
            await this.uow.do(async () => {
                const user = await this.userCommandRepo.findById(userId);
                if (!user) {
                    throw new TechnicalException({
                        type: TechnicalExceptionType.RESOURCE_NOT_FOUND,
                    });
                }
                await this.userCommandRepo.removeById(userId);
            });
        } catch (err) {
            if (err instanceof TechnicalException) {
                if (err.type === TechnicalExceptionType.RESOURCE_NOT_FOUND) {
                    throw new BusinessException({
                        type: BusinessExceptionType.USER_NOT_FOUND,
                    });
                }
            }
            throw err;
        }
    }
}

