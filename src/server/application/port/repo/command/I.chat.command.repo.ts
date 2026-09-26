import { ChatEntity } from "../../../command/entity/chat.entity";

export interface IChatCommandRepo {
    create(chat: ChatEntity): Promise<ChatEntity>;
    findById(id: string): Promise<ChatEntity>;
    update(entity: ChatEntity): Promise<void>;
    deleteById(id: string): Promise<void>;
}