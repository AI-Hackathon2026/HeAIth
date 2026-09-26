import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import type { Message } from "../types";
import { MarkdownContent } from "./MarkdownContent";
import { TypewriterText } from "./TypewriterText";
import { TypingIndicator } from "./TypingIndicator";

export interface PendingUserMessage {
  id: string;
  text: string;
  createdAt: string;
}

export type AiPendingState =
  | { phase: "waiting" }
  | { phase: "typing"; text: string }
  | { phase: "error"; text: string };

interface MessageListProps {
  messages: Message[];
  pendingUserMessage?: PendingUserMessage | null;
  aiPending?: AiPendingState | null;
  typewriterStopRef?: MutableRefObject<boolean>;
  onTypingComplete?: () => void;
  onTypingStopped?: (partialText: string) => void;
  onEditMessage: (messageId: string, text: string) => Promise<void>;
  onDeleteMessage: (messageId: string) => Promise<void>;
}

const SCROLL_THRESHOLD = 80;

export function MessageList({
  messages,
  pendingUserMessage,
  aiPending,
  typewriterStopRef,
  onTypingComplete,
  onTypingStopped,
  onEditMessage,
  onDeleteMessage,
}: MessageListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const checkNearBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) return true;
    return (
      el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_THRESHOLD
    );
  }, []);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      if (isNearBottomRef.current) {
        bottomRef.current?.scrollIntoView({ behavior });
      }
    },
    [],
  );

  const handleScroll = useCallback(() => {
    isNearBottomRef.current = checkNearBottom();
  }, [checkNearBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (pendingUserMessage) {
      isNearBottomRef.current = true;
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [pendingUserMessage]);

  useEffect(() => {
    if (aiPending?.phase === "waiting" || aiPending?.phase === "error") {
      scrollToBottom("smooth");
    }
  }, [aiPending, scrollToBottom]);

  const handleTypingProgress = useCallback(() => {
    scrollToBottom("auto");
  }, [scrollToBottom]);

  const handleTypingComplete = useCallback(() => {
    onTypingComplete?.();
  }, [onTypingComplete]);

  const handleTypingStopped = useCallback(
    (partialText: string) => {
      onTypingStopped?.(partialText);
    },
    [onTypingStopped],
  );

  async function saveEdit(messageId: string) {
    if (!editText.trim()) return;
    await onEditMessage(messageId, editText.trim());
    setEditingId(null);
    setEditText("");
  }

  const hasContent =
    messages.length > 0 || pendingUserMessage || aiPending;

  if (!hasContent) {
    return (
      <div className="message-empty">
        <p>메시지를 입력하여 AI와 대화를 시작하세요.</p>
      </div>
    );
  }

  return (
    <div className="message-list" ref={listRef} onScroll={handleScroll}>
      {messages.map((message) => {
        const isUser = message.from === "USER";
        const isEditing = editingId === message.id;

        return (
          <div
            key={message.id}
            className={`message-row ${isUser ? "user" : "ai"}`}
          >
            <div className="message-meta">
              <span className="message-role">{isUser ? "나" : "AI"}</span>
              <time dateTime={message.createdAt}>
                {new Date(message.createdAt).toLocaleString("ko-KR")}
              </time>
            </div>

            {isEditing ? (
              <div className="message-edit">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={3}
                />
                <div className="message-actions">
                  <button type="button" onClick={() => saveEdit(message.id)}>
                    저장
                  </button>
                  <button type="button" onClick={() => setEditingId(null)}>
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="message-bubble">
                  {isUser ? message.text : <MarkdownContent content={message.text} />}
                </div>
                {isUser && (
                  <div className="message-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(message.id);
                        setEditText(message.text);
                      }}
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteMessage(message.id)}
                    >
                      삭제
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}

      {pendingUserMessage && (
        <div className="message-row user">
          <div className="message-meta">
            <span className="message-role">나</span>
            <time dateTime={pendingUserMessage.createdAt}>
              {new Date(pendingUserMessage.createdAt).toLocaleString("ko-KR")}
            </time>
          </div>
          <div className="message-bubble">{pendingUserMessage.text}</div>
        </div>
      )}

      {aiPending?.phase === "waiting" && (
        <div className="message-row ai">
          <div className="message-meta">
            <span className="message-role">AI</span>
          </div>
          <div className="message-bubble">
            <TypingIndicator />
          </div>
        </div>
      )}

      {aiPending?.phase === "typing" && (
        <div className="message-row ai">
          <div className="message-meta">
            <span className="message-role">AI</span>
          </div>
          <div className="message-bubble">
            <TypewriterText
              text={aiPending.text}
              stopRef={typewriterStopRef}
              onComplete={handleTypingComplete}
              onProgress={handleTypingProgress}
              onStopped={handleTypingStopped}
            />
          </div>
        </div>
      )}

      {aiPending?.phase === "error" && (
        <div className="message-row ai">
          <div className="message-meta">
            <span className="message-role">AI</span>
          </div>
          <div className="message-bubble message-bubble-error">
            {aiPending.text}
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
