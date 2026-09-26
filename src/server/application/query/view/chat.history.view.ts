import { ChatView } from "./chat.view";
import { MessageView } from "./message.view";

export interface ChatHistoryView {
    id : string;
    title: string;
    messages: MessageView[];
}
