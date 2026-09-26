import { Role } from "@/server/shared/types/enums";

export interface UserView {
    id: string;
    email: string;
    username: string;
    role: Role;
    createdAt: Date;
    updatedAt: Date;
}
