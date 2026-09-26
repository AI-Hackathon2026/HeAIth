import { NewUserEntity, PersistUserEntity } from "../../../command/entity/user.entity";

export interface IUserCommandRepo {
    create(user: NewUserEntity): Promise<PersistUserEntity>;
    findByEmail(email: string): Promise<PersistUserEntity | null>;
    findById(id: string): Promise<PersistUserEntity>;
    update(entity: PersistUserEntity): Promise<PersistUserEntity>;
    removeById(id: string): Promise<void>;
}