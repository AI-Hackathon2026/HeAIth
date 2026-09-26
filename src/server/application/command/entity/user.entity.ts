import { Role } from "@/server/shared/types/enums";
import { BusinessException, BusinessExceptionType } from "../../../shared/exceptions/business.exception";
import { IHashManager } from "../../port/managers/I.hash.manager";

export type NewUserEntity = Omit<UserEntity, "id">;

export interface PersistUserEntity extends UserEntity {
    id: string;
}


export class UserEntity {
    private readonly _id?: string;
    private _username: string;
    private _refreshToken?: string;
    private _email: string;
    private _password: string;
    private _role: Role;



    private constructor(attrs: {
        id?: string;
        refreshToken?: string;
        email: string;
        username: string;
        password: string;
        role: Role;
    }) {
        this._id = attrs.id;
        this._refreshToken = attrs.refreshToken;
        this._email = attrs.email;
        this._username = attrs.username;
        this._password = attrs.password;
        this._role = attrs.role;
    }
    static createPersist(params: {
        id?: string;
        refreshToken?: string;
        email: string;
        username: string;
        password: string;
        role: Role;
    }): PersistUserEntity {
        return new UserEntity(params) as PersistUserEntity;
    }
    static async createNew(params: {
        email: string;
        username: string;
        password: string;
        hashManager: IHashManager;
        role: Role;
    }): Promise<NewUserEntity> {
        const hashedPassword = await params.hashManager.hash(params.password);

        return new UserEntity({
            ...params,
            role: params.role,
            password: hashedPassword,
            username: params.username
        }) as NewUserEntity;
    }


    async updateRefreshToken(
        refreshToken: string,
        hashManager: IHashManager,
    ): Promise<void> {
        if (!this._refreshToken) {
            this._refreshToken = await hashManager.hash(refreshToken);
            return;
        }

        if (
            await hashManager.compare({
                plainString: refreshToken,
                hashedString: this._refreshToken,
            })
        ) {
            return;
        }

        this._refreshToken = await hashManager.hash(refreshToken);
        return;
    }

    async isRefreshTokenMatch(
        refreshToken: string,
        hashManager: IHashManager,
    ): Promise<boolean> {
        if (!this._refreshToken) {
            throw new BusinessException({
                type: BusinessExceptionType.USER_NOT_FOUND,
            });
        }

        return await hashManager.compare({
            plainString: refreshToken,
            hashedString: this._refreshToken,
        });
    }

    deleteRefreshToken(): void {
        this._refreshToken = undefined;
    }

    isPasswordMatch(password: string, hashManager: IHashManager): Promise<boolean> {
        return hashManager.compare({ plainString: password, hashedString: this._password });
    }


    get id() {
        return this._id;
    }

    get refreshToken() {
        return this._refreshToken;
    }

    get role() {
        return this._role;
    }

    get email() {
        return this._email;
    }

    get username() {
        return this._username;
    }

    get password() {
        return this._password;
    }
}
