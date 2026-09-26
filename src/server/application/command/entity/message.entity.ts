import { Role } from "@/server/shared/types/enums";

export class MessageEntity {
    id?: string;
    role : Role;
    chatId: string;
    text: string;

    constructor({
        id,
        role,
        chatId,
        text
    }: {
        id?: string,
        role: Role,
        chatId: string,
        text: string
    }) {
        this.id = id;
        this.role = role;
        this.chatId = chatId;
        this.text = text;
    }

    update(text: string) {
        this.text = text;
    }
}
