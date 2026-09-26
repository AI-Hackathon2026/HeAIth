import { IChatQueryRepo } from "../../port/repo/query/I.chat.query.repo";
import { BusinessException, BusinessExceptionType } from "../../../shared/exceptions/business.exception";

export class ChatQueryService {
    constructor(private readonly chatQueryRepo: IChatQueryRepo) { }

    async getChatHistory(chatId: string) {
        try {
            const chatHistory = await this.chatQueryRepo.findMessages(chatId);
            return chatHistory;
        } catch (error) {
            throw error;
        }
    }

    async showChats(userId: string) {
        try {
            const chats = await this.chatQueryRepo.findAll(userId);
            return chats;
        } catch (error) {
            throw error;
        }
    }

    /** Throws unless `chatId` exists and belongs to `userId`. */
    async assertChatOwner(chatId: string, userId: string) {
        const chat = await this.chatQueryRepo.findById(chatId);
        if (!chat) {
            throw new BusinessException({ type: BusinessExceptionType.MESSAGE_NOT_FOUND });
        }
        if (chat.userId !== userId) {
            throw new BusinessException({
                type: BusinessExceptionType.UNAUTORIZED_REQUEST,
                message: "You do not have access to this chat.",
            });
        }
    }

    async listMessagesForUser(chatId: string, userId: string) {
        const chat = await this.chatQueryRepo.findById(chatId);
        if (!chat || chat.userId !== userId) {
            throw new BusinessException({ type: BusinessExceptionType.ROUTINE_NOT_FOUND });
        }

        const history = await this.chatQueryRepo.findMessages(chatId);
        return history.messages.map((message) => ({
            id: message.id ?? "",
            role: message.from,
            text: message.text,
            createdAt: message.createdAt,
            updatedAt: message.updatedAt,
        }));
    }
}
