import { UserEntity } from "../../../command/entity/user.entity"
import { UserView } from "../../../query/view/user.view";

export interface IUserQueryRepo {
    getUserById(id: string): Promise<UserEntity | null>;
    findAll(): Promise<UserView[]>;
    findByEmail(email: string): Promise<UserView>;
}