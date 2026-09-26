import { ChatHistoryView } from "../../../query/view/chat.history.view";
import { ChatView } from "../../../query/view/chat.view";

export type ChatDetailView = {
    id: string;
    userId: string;
    title: string;
    routineId: string | null;
};

export interface IChatQueryRepo {
    findAll(userId: string): Promise<ChatView[]>;
    findMessages(chatId: string): Promise<ChatHistoryView>;
    findById(chatId: string): Promise<ChatDetailView | null>;
    findByUserIdAndRoutineId(userId: string, routineId: string): Promise<ChatDetailView | null>;
}