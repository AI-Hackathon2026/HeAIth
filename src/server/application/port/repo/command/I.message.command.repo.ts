import { MessageEntity } from "../../../command/entity/message.entity";


export interface IMessageCommandRepo {
    create(entity: MessageEntity): Promise<void>;
    findById(id: string): Promise<MessageEntity>;
    update(entity: MessageEntity): Promise<void>;
    deleteById(id: string): Promise<void>;
}