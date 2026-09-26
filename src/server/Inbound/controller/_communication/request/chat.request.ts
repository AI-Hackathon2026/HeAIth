import { z } from "zod";

export const createChatSchema = z.object({
    userId: z.uuid(),
    title: z.string(),
});


export const updateChatSchema = z.object({
    userId: z.uuid(),
    chatId: z.uuid(),
    title: z.string()
});


export const deleteChatSchema = z.object({
    userId: z.uuid(),
    chatId: z.uuid(),
});


export type CreateChatDto = z.infer<typeof createChatSchema>;
export type UpdateChatDto = z.infer<typeof updateChatSchema>;
export type DeleteChatDto = z.infer<typeof deleteChatSchema>;