import { CreateChatDto, DeleteChatDto, UpdateChatDto } from "../../../Inbound/controller/_communication/request/chat.request";
import { CreateMessageDto, DeleteMessageDto, UpdateMessageDto } from "../../../Inbound/controller/_communication/request/message.request";
import { BusinessException, BusinessExceptionType } from "../../../shared/exceptions/business.exception";
import { IChatCommandRepo } from "../../port/repo/command/I.chat.command.repo";
import { ChatEntity } from "../entity/chat.entity";
import { MessageEntity } from "../entity/message.entity";
import { IMessageCommandRepo } from "../../port/repo/command/I.message.command.repo";

export class ChatCommandService {
    private chatCommandRepo: IChatCommandRepo;
    private messageCommandRepo: IMessageCommandRepo;

    constructor(
        chatCommandRepo: IChatCommandRepo,
        messageCommandRepo: IMessageCommandRepo
    ) {
        this.chatCommandRepo = chatCommandRepo;
        this.messageCommandRepo = messageCommandRepo;
    }

    async saveChat(chatDto: CreateChatDto) {
        try {
            const newChat = new ChatEntity({
                userId: chatDto.userId,
                title: chatDto.title
            });

            const savedChat = await this.chatCommandRepo.create(newChat);
            return savedChat;
        } catch (error) {
            throw error;
        }
    }


    async updateChat(chatDto: UpdateChatDto) {
        try {
            const { userId, chatId, title } = chatDto;

            const foundChat = await this.chatCommandRepo.findById(chatId);
            if (foundChat.userId !== userId) {
                throw new BusinessException({
                    type: BusinessExceptionType.UNAUTORIZED_REQUEST
                });
            }

            foundChat.update({
                userId,
                title
            });

            const response = await this.chatCommandRepo.update(foundChat);
            return response;
        } catch (error) {
            throw error;
        }
    }

    async deleteChat(dto: DeleteChatDto) {
        try {
            const { chatId, userId } = dto;

            const foundChat = await this.chatCommandRepo.findById(chatId);
            if (foundChat.userId !== userId) {
                throw new BusinessException({
                    type: BusinessExceptionType.UNAUTORIZED_REQUEST
                });
            }

            await this.chatCommandRepo.deleteById(chatId);
        } catch (error) {
            throw error;
        }
    }

    async saveChatMessage(dto: CreateMessageDto) {
        try {
            const { chatId, text, role } = dto;

            const message = new MessageEntity({
                role,
                chatId,
                text
            })

            const response = await this.messageCommandRepo.create(message);
            return response;
        } catch (error) {
            throw error;
        }
    }

    async updateChatMessage(dto : UpdateMessageDto) {
        try {
            const { chatId, messageId, text, userId } = dto;
            
            const foundMessage = await this.messageCommandRepo.findById(messageId);
            if (!foundMessage) {
                throw new BusinessException({
                    type: BusinessExceptionType.MESSAGE_NOT_FOUND
                });
            }

            foundMessage.update(text);
            const response = await this.messageCommandRepo.update(foundMessage);
            return response;
        } catch (error) {
            throw error;
        }
    }

    async deleteChatMessage(dto : DeleteMessageDto) {
        try {
            const { chatId, messageId, userId } = dto;
            await this.messageCommandRepo.deleteById(messageId);
        } catch (error) {
            throw error;
        }
    }
}