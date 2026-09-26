import { useCallback, useEffect, useState } from "react";
import {
  ensureRoutineChat,
  getRoutineChatHistory,
  sendRoutineChatMessage,
} from "../api/routine-chat.api";
import type {
  RoutineChatMessage,
  UpdatedRoutine,
} from "../types/routine-chat.types";

interface UseRoutineChatOptions {
  chatId: string | null;
  onRoutineUpdate: (routine: UpdatedRoutine) => void;
  onChatIdResolved?: (chatId: string) => void;
}

export function useRoutineChat({
  chatId: initialChatId,
  onRoutineUpdate,
  onChatIdResolved,
}: UseRoutineChatOptions) {
  const [chatId, setChatId] = useState<string | null>(initialChatId);
  const [messages, setMessages] = useState<RoutineChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState("");

  useEffect(() => {
    setChatId(initialChatId);
  }, [initialChatId]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      setError("");

      try {
        let id = initialChatId;

        if (!id) {
          const result = await ensureRoutineChat();
          id = result.chatId;
          if (!cancelled) {
            setChatId(id);
            onChatIdResolved?.(id);
          }
        }

        const history = await getRoutineChatHistory(id);
        if (!cancelled) {
          setMessages(history);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "대화 내용을 불러올 수 없습니다.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, [initialChatId, onChatIdResolved]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!chatId || !text.trim() || sending) return;

      const tempUserMsg: RoutineChatMessage = {
        id: `temp-${Date.now()}`,
        role: "USER",
        text: text.trim(),
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, tempUserMsg]);
      setSending(true);
      setError("");

      try {
        const response = await sendRoutineChatMessage(chatId, text.trim());

        const aiId = `ai-${Date.now()}`;
        const aiMsg: RoutineChatMessage = {
          id: aiId,
          role: "AI",
          text: response.aiResponse,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, aiMsg]);
        setStreamingMessageId(aiId);
        setSending(false);

        if (response.routineUpdated && response.routine) {
          onRoutineUpdate(response.routine);
        }
      } catch (err) {
        setSending(false);
        setMessages((prev) => prev.filter((message) => message.id !== tempUserMsg.id));
        setError(err instanceof Error ? err.message : "메시지 전송에 실패했습니다.");
      }
    },
    [chatId, sending, onRoutineUpdate],
  );

  const completeStreaming = useCallback(() => {
    setStreamingMessageId(null);
  }, []);

  return {
    chatId,
    messages,
    loading,
    sending,
    streamingMessageId,
    error,
    sendMessage,
    completeStreaming,
  };
}
