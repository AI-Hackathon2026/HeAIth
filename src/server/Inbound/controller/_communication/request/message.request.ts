import { Role } from "@/server/shared/types/enums";
import { z } from "zod";
import { GeminiVersion } from "../../../../outbound/chatbot/gemini";


export const changeModelSchema = z.object({
    model: z.enum(GeminiVersion)
});

export const createMessageSchema = z.object({
    role : z.enum(Role),
    chatId: z.uuid(),
    text: z.string(),
});


export const updateMessageSchema = z.object({
    userId: z.uuid(),
    chatId: z.uuid(),
    messageId: z.uuid(),
    text: z.string()
});


export const deleteMessageSchema = z.object({
    userId: z.uuid(),
    chatId: z.uuid(),
    messageId: z.uuid(),
});


export type CreateMessageDto = z.infer<typeof createMessageSchema>;
export type UpdateMessageDto = z.infer<typeof updateMessageSchema>;
export type DeleteMessageDto = z.infer<typeof deleteMessageSchema>;