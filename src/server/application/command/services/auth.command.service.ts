import { Role } from "@/server/shared/types/enums";
import { CreateUserDto, SignInDto } from "../../../Inbound/controller/_communication/request/user.request";
import { BusinessException, BusinessExceptionType } from "../../../shared/exceptions/business.exception";
import { TechnicalException, TechnicalExceptionType } from "../../../shared/exceptions/technical.exception";
import { IConfigUtil } from "../../../shared/utils/config.util";
import { ITokenUtil } from "../../../shared/utils/token.util";
import { IHashManager } from "../../port/managers/I.hash.manager";
import { IUserCommandRepo } from "../../port/repo/command/I.user.command.repo";
import { IUnitOfWork } from "../../port/repo/I.unit.of.work";
import { NewUserEntity, UserEntity } from "../entity/user.entity";
import { IEmailUtil } from "../../port/managers/I.email.util";
import { approvalRequestMessage } from "../../../shared/messages/approval.request";
import { waitingApprovalMessage } from "../../../shared/messages/waiting.approval";



export class AuthCommandService {
    private _uow: IUnitOfWork;
    private _configUtil: IConfigUtil;

    constructor(
        _uow: IUnitOfWork,
        _configUtil: IConfigUtil,
        public readonly hashManager: IHashManager,
        public readonly tokenUtil: ITokenUtil,
        public readonly emailUtil: IEmailUtil,
        public readonly userCommandRepo: IUserCommandRepo,
    ) {
        this._uow = _uow;
        this._configUtil = _configUtil;
    }

    private async sendWaitingApprovalNotifications(applicantEmail: string): Promise<void> {
        const adminEmail = this._configUtil.parsed().ADMIN_EMAIL;

        const { text: waitingApprovalText, html: waitingApprovalHtml } = waitingApprovalMessage({
            email: applicantEmail,
        });

        const { text: approvalRequestText, html: approvalRequestHtml } = approvalRequestMessage({
            applicantEmail,
            registeredAt: new Date().toISOString(),
        });

        await this.emailUtil.sendEmail({
            to: applicantEmail,
            subject: "Waiting for approval",
            text: waitingApprovalText,
            html: waitingApprovalHtml,
        });

        if (!adminEmail) return;
        await this.emailUtil.sendEmail({
            to: adminEmail,
            subject: "Approval request",
            text: approvalRequestText,
            html: approvalRequestHtml,
        });
    }

    async signIn(dto: SignInDto): Promise<{
        username: string;
        accessToken: string;
        refreshToken: string;
        csrfValue: string;
    }> {
        try {
            const { email, password } = dto;
            const { role, userId, username, refreshToken } = await this._uow.do(async () => {
                const foundUser = await this.userCommandRepo.findByEmail(email);
                if (!foundUser) {
                    throw new BusinessException({
                        type: BusinessExceptionType.USER_NOT_FOUND,
                    });
                }


                const isPasswordMatch = await foundUser.isPasswordMatch(password, this.hashManager);
                if (!isPasswordMatch) {
                    throw new BusinessException({
                        type: BusinessExceptionType.INVALID_AUTH,
                    });
                }


                const refreshToken = this.tokenUtil.generateRefreshToken({
                    userId: foundUser.id,
                    role: foundUser.role
                });

                await foundUser.updateRefreshToken(refreshToken, this.hashManager);
                await this.userCommandRepo.update(foundUser);
                return { role: foundUser.role, refreshToken, userId: foundUser.id, username: foundUser.username };
            });

            const accessToken = this.tokenUtil.generateAccessToken({ role, userId });
            const csrfValue = this.tokenUtil.generateCsrfValue();
            return { username, accessToken, refreshToken, csrfValue };
        } catch (err) {
            throw err;
        }
    }

    async signUp(dto: CreateUserDto): Promise<NewUserEntity> {
        try {
            const { role, email, password, username } = dto;
            const user = await UserEntity.createNew({
                role,
                email,
                username,
                password,
                hashManager: this.hashManager
            });

            await this.userCommandRepo.create(user);

            await this.sendWaitingApprovalNotifications(dto.email);

            return user;
        } catch (err) {
            if (err instanceof TechnicalException) {
                if (err.type === TechnicalExceptionType.UNIQUE_VIOLATION) {
                    throw new BusinessException({
                        type: BusinessExceptionType.EMAIL_DUPLICATE,
                        error: err
                    });
                }
            }
            throw err;
        }
    }



    async refreshTokens(refreshToken: string): Promise<{
        newAccessToken: string;
        newRefreshToken: string;
        newCsrfValue: string;
    }> {
        try {

            const { userId, role } = this.tokenUtil.verifyToken({ token: refreshToken });

            const newRefreshToken = await this._uow.do(async () => {
                const foundUser = await this.userCommandRepo.findById(userId);

                if (!foundUser) {
                    throw new BusinessException({
                        type: BusinessExceptionType.USER_NOT_FOUND,
                    });
                }


                const isRefreshTokenMatch = await foundUser.isRefreshTokenMatch(refreshToken, this.hashManager);
                if (!isRefreshTokenMatch) {
                    throw new BusinessException({
                        type: BusinessExceptionType.INVALID_AUTH,
                    });
                }

                const newRefreshToken = this.tokenUtil.generateRefreshToken({ userId, role });
                await foundUser.updateRefreshToken(newRefreshToken, this.hashManager);

                await this.userCommandRepo.update(foundUser);

                return newRefreshToken;
            });
            const newAccessToken = this.tokenUtil.generateAccessToken({
                role,
                userId
            });
            const newCsrfValue = this.tokenUtil.generateCsrfValue();

            return {
                newAccessToken,
                newRefreshToken,
                newCsrfValue,
            };
        } catch (err) {
            throw err;
        }
    }

    async signOut(refreshToken: string): Promise<void> {
        try {
            const { userId } = this.tokenUtil.verifyToken({
                token: refreshToken,
                ignoreExpiration: true,
            });


            return this._uow.do(async () => {
                try {
                    const user = await this.userCommandRepo.findById(userId);
                    if (!user) {
                        return;
                    }


                    if (
                        !(await user.isRefreshTokenMatch(refreshToken, this.hashManager))
                    ) {
                        return;
                    }

                    user.deleteRefreshToken();
                    await this.userCommandRepo.update(user);
                } catch (err) {
                    if (err instanceof TechnicalException) {
                        if (err.type === TechnicalExceptionType.OPTIMISTIC_LOCK_FAILED) {
                            return;
                        }
                    }

                    throw err;
                }
            });
        } catch (err) {
            console.log(err);
            throw err;
        }
    }
}
