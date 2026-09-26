import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRoutineChat } from "../../hooks/useRoutineChat";
import type { UpdatedRoutine } from "../../types/routine-chat.types";
import {
  RoutineChatTypingIndicator,
  RoutineMessageBubble,
} from "../chat/RoutineMessageBubble";
import { RoutineChatStarterMarquee } from "./RoutineChatStarterMarquee";

interface Props {
  chatId: string | null;
  variant?: "page" | "popup";
  onClose: () => void;
  onRoutineUpdate: (routine: UpdatedRoutine) => void;
  onChatIdResolved?: (chatId: string) => void;
}

export function RoutineChatScreen({
  chatId,
  variant = "page",
  onClose,
  onRoutineUpdate,
  onChatIdResolved,
}: Props) {
  const [inputText, setInputText] = useState("");
  const [toast, setToast] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const {
    messages,
    loading,
    sending,
    streamingMessageId,
    error,
    sendMessage,
    completeStreaming,
  } = useRoutineChat({
    chatId,
    onRoutineUpdate: (routine) => {
      onRoutineUpdate(routine);
      setToast("루틴이 업데이트되었어요 ✅");
      window.setTimeout(() => setToast(""), 4000);
    },
    onChatIdResolved,
  });

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending, scrollToBottom]);

  async function onSend(event?: FormEvent) {
    event?.preventDefault();
    if (!inputText.trim() || sending) return;

    const text = inputText;
    setInputText("");
    await sendMessage(text);
  }

  return (
    <div className={`routine-chat${variant === "popup" ? " routine-chat--popup" : ""}`}>
      {variant === "page" && (
        <header className="routine-chat-header routine-chat-header--v2">
          <button
            type="button"
            className="routine-chat-back-btn"
            onClick={onClose}
            aria-label="닫기"
          >
            ←
          </button>
          <div className="routine-chat-header-copy">
            <p className="routine-chat-header-title">AI 루틴 상담</p>
          </div>
        </header>
      )}

      {toast && <div className="routine-toast">{toast}</div>}
      {error && <div className="banner-error">{error}</div>}

      <div className="routine-chat-messages">
        {loading && (
          <p className="routine-chat-loading">대화 내용을 불러오는 중...</p>
        )}

        {!loading && messages.length === 0 && (
          <div className="routine-chat-starters-empty">
            <p className="routine-chat-empty">
              루틴에 대해 무엇이든 물어보세요
            </p>
          </div>
        )}

        {messages.map((message) => (
          <RoutineMessageBubble
            key={message.id}
            message={message}
            isStreaming={message.id === streamingMessageId}
            onStreamComplete={completeStreaming}
            onStreamProgress={scrollToBottom}
          />
        ))}

        {sending && !streamingMessageId && <RoutineChatTypingIndicator />}

        <div ref={bottomRef} />
      </div>

      {!loading && (
        <RoutineChatStarterMarquee
          disabled={sending || streamingMessageId !== null}
          onSelect={sendMessage}
        />
      )}

      <form className="routine-chat-composer routine-chat-composer--v2" onSubmit={(e) => void onSend(e)}>
        <textarea
          value={inputText}
          onChange={(event) => setInputText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void onSend();
            }
          }}
          placeholder="루틴에 대해 물어보거나 조정을 요청하세요..."
          rows={1}
          disabled={sending || loading || streamingMessageId !== null}
        />
        <button
          type="submit"
          className="routine-chat-send-btn"
          disabled={
            sending ||
            loading ||
            streamingMessageId !== null ||
            !inputText.trim()
          }
          aria-label="전송"
        >
          ↑
        </button>
      </form>
    </div>
  );
}
