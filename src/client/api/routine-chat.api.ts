import { api, withAuthRetry } from "./client";
import type {
  EnsureRoutineChatResult,
  RoutineChatMessage,
  RoutineChatResponse,
} from "../types/routine-chat.types";

export async function ensureRoutineChat(): Promise<EnsureRoutineChatResult> {
  return withAuthRetry(() => api.ensureRoutineChat());
}

export async function sendRoutineChatMessage(
  chatId: string,
  text: string,
): Promise<RoutineChatResponse> {
  return withAuthRetry(() => api.sendRoutineChatMessage(chatId, text));
}

export async function getRoutineChatHistory(
  chatId: string,
): Promise<RoutineChatMessage[]> {
  return withAuthRetry(() => api.getRoutineChatMessages(chatId));
}
