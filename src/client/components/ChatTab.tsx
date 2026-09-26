import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { api, matchModelToList, withAuthRetry } from "../api/client";
import { ChatSidebar } from "./ChatSidebar";
import {
  type AiPendingState,
  type PendingUserMessage,
  MessageList,
} from "./MessageList";
import { ModelSelector } from "./ModelSelector";
import type { ChatHistory, ChatSummary } from "../types";

interface ChatTabProps {
  username: string;
  variant?: "page" | "popup" | "reader";
  contextLabel?: string;
}

export function ChatTab({
  username,
  variant = "page",
  contextLabel,
}: ChatTabProps) {
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatHistory | null>(null);
  const [chatTitle, setChatTitle] = useState("");
  const [input, setInput] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [currentModel, setCurrentModel] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingUserMessage, setPendingUserMessage] =
    useState<PendingUserMessage | null>(null);
  const [aiPending, setAiPending] = useState<AiPendingState | null>(null);
  const [error, setError] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const activeChatIdRef = useRef(activeChatId);
  activeChatIdRef.current = activeChatId;
  const abortControllerRef = useRef<AbortController | null>(null);
  const typewriterStopRef = useRef(false);
  const loadChats = useCallback(async () => {
    const data = await withAuthRetry(() => api.listChats());
    setChats(data);
    return data;
  }, []);

  const loadModels = useCallback(async () => {
    const [available, currentRaw] = await Promise.all([
      withAuthRetry(() => api.getAvailableModels()),
      withAuthRetry(() => api.getCurrentModel()),
    ]);
    setModels(available);
    setCurrentModel(matchModelToList(String(currentRaw), available));
  }, []);

  const loadChatHistory = useCallback(async (chatId: string) => {
    const history = await withAuthRetry(() => api.getChatHistory(chatId));
    setChatHistory(history);
    setChatTitle(history.title);
    return history;
  }, []);

  useEffect(() => {
    Promise.all([loadChats(), loadModels()])
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "채팅 데이터를 불러올 수 없습니다.",
        );
      })
      .finally(() => setLoading(false));
  }, [loadChats, loadModels]);

  useEffect(() => {
    if (!activeChatId) {
      setChatHistory(null);
      setChatTitle("");
      setPendingUserMessage(null);
      setAiPending(null);
      return;
    }
    setPendingUserMessage(null);
    setAiPending(null);
    setSending(false);
    abortControllerRef.current?.abort();
    typewriterStopRef.current = true;
    abortControllerRef.current = null;
    loadChatHistory(activeChatId).catch((err) => {
      setError(
        err instanceof Error ? err.message : "대화를 불러올 수 없습니다.",
      );
    });
  }, [activeChatId, loadChatHistory]);

  async function handleCreateChat() {
    setError("");
    const created = await withAuthRetry(() => api.createChat("새 대화"));
    const updated = await loadChats();
    setActiveChatId(created.id ?? updated[0]?.id ?? null);
  }

  async function handleDeleteChat(chatId: string) {
    if (!confirm("이 대화를 삭제하시겠습니까?")) return;
    setError("");
    await withAuthRetry(() => api.deleteChat(chatId));
    const updated = await loadChats();
    if (activeChatId === chatId) {
      setActiveChatId(updated[0]?.id ?? null);
    }
  }

  async function handleRenameChat(event: FormEvent) {
    event.preventDefault();
    if (!activeChatId || !chatTitle.trim()) return;
    setRenaming(true);
    setError("");
    try {
      await withAuthRetry(() =>
        api.updateChat(activeChatId, chatTitle.trim()),
      );
      await loadChats();
      if (chatHistory) {
        setChatHistory({ ...chatHistory, title: chatTitle.trim() });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "제목 변경 실패");
    } finally {
      setRenaming(false);
    }
  }

  async function finalizeGeneration() {
    if (!activeChatId) return;
    abortControllerRef.current = null;
    typewriterStopRef.current = false;
    setPendingUserMessage(null);
    setAiPending(null);
    setSending(false);
    try {
      await loadChatHistory(activeChatId);
      await loadChats();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "대화를 불러올 수 없습니다.",
      );
    }
  }

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    if (!activeChatId || !input.trim() || sending) return;

    const text = input.trim();
    const chatId = activeChatId;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    typewriterStopRef.current = false;

    setInput("");
    setSending(true);
    setError("");
    setPendingUserMessage({
      id: `pending-user-${Date.now()}`,
      text,
      createdAt: new Date().toISOString(),
    });
    setAiPending({ phase: "waiting" });

    try {
      const aiResponse = await withAuthRetry(() =>
        api.sendToChatbot(chatId, text, controller.signal),
      );
      if (activeChatIdRef.current !== chatId || typewriterStopRef.current) {
        return;
      }
      setAiPending({ phase: "typing", text: aiResponse });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      if (activeChatIdRef.current !== chatId) {
        return;
      }
      const errorText =
        err instanceof Error ? err.message : "메시지 전송에 실패했습니다.";
      setAiPending({ phase: "error", text: errorText });
      setSending(false);
      abortControllerRef.current = null;
    }
  }

  function handleStop(event: FormEvent) {
    event.preventDefault();
    if (!sending) return;

    typewriterStopRef.current = true;
    abortControllerRef.current?.abort();

    if (aiPending?.phase === "typing") {
      return;
    }

    void finalizeGeneration();
  }

  async function handleTypingComplete() {
    await finalizeGeneration();
  }

  async function handleTypingStopped() {
    await finalizeGeneration();
  }

  async function handleEditMessage(messageId: string, text: string) {
    if (!activeChatId) return;
    await withAuthRetry(() => api.updateMessage(activeChatId, messageId, text));
    await loadChatHistory(activeChatId);
  }

  async function handleDeleteMessage(messageId: string) {
    if (!activeChatId) return;
    if (!confirm("이 메시지를 삭제하시겠습니까?")) return;
    await withAuthRetry(() => api.deleteMessage(activeChatId, messageId));
    await loadChatHistory(activeChatId);
  }

  async function handleModelChange(model: string) {
    setError("");
    try {
      await withAuthRetry(() => api.changeModel(model));
      setCurrentModel(model);
    } catch (err) {
      setError(err instanceof Error ? err.message : "모델 변경 실패");
    }
  }

  if (loading) {
    const loadingClass =
      variant === "reader"
        ? "document-chat-loading"
        : variant === "popup"
          ? "chat-popup-loading"
          : "tab-loading";
    return (
      <div className={loadingClass}>
        <div className="spinner" />
        <p>{variant === "reader" ? "Loading history…" : "채팅 불러오는 중..."}</p>
      </div>
    );
  }

  const shellClass = [
    "app-shell",
    variant === "popup" ? "app-shell--popup" : "",
    variant === "reader" ? "app-shell--reader" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const readerGreeting = contextLabel
    ? `Good day. I can see you're reading “${contextLabel}”. Ask about this manual or related documents.`
    : "Good day. I can help you browse manuals and find answers in the document library.";

  return (
    <div className={shellClass}>
      <ChatSidebar
        chats={chats}
        activeChatId={activeChatId}
        username={username}
        onSelectChat={setActiveChatId}
        onCreateChat={handleCreateChat}
        onDeleteChat={handleDeleteChat}
      />

      <main className="chat-main">
        <header className="chat-header">
          <form className="title-form" onSubmit={handleRenameChat}>
            <input
              type="text"
              value={chatTitle}
              onChange={(e) => setChatTitle(e.target.value)}
              placeholder="대화 제목"
              disabled={!activeChatId}
            />
            <button type="submit" disabled={!activeChatId || renaming}>
              제목 저장
            </button>
          </form>
          <ModelSelector
            models={models}
            currentModel={currentModel}
            onChange={handleModelChange}
          />
        </header>

        {error && <div className="banner-error">{error}</div>}

        {!activeChatId ? (
          <div className="welcome-panel">
            {variant === "reader" ? (
              <>
                <div className="document-chat-greeting-card">
                  <span className="document-chat-greeting-icon" aria-hidden>
                    📖
                  </span>
                  <p>{readerGreeting}</p>
                </div>
                <button
                  type="button"
                  className="document-chat-primary-btn"
                  onClick={handleCreateChat}
                >
                  Open chats menu
                </button>
              </>
            ) : (
              <>
                <h2>HeAIth AI 건강 상담</h2>
                <p>
                  AI와 대화하며 건강 관련 질문에 답변받으세요.
                  {variant === "popup"
                    ? " 새 대화를 시작하거나 기존 대화를 선택하세요."
                    : " 왼쪽에서 새 대화를 만들거나 기존 대화를 선택하세요."}
                </p>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={handleCreateChat}
                >
                  새 대화 시작
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            <MessageList
              messages={chatHistory?.messages ?? []}
              pendingUserMessage={pendingUserMessage}
              aiPending={aiPending}
              typewriterStopRef={typewriterStopRef}
              onTypingComplete={handleTypingComplete}
              onTypingStopped={handleTypingStopped}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
            />

            <form
              className="composer"
              onSubmit={sending ? handleStop : handleSend}
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  variant === "reader"
                    ? activeChatId
                      ? "Ask about a manual or chapter…"
                      : "Create or select a chatroom…"
                    : "메시지를 입력하세요..."
                }
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !sending) {
                    e.preventDefault();
                    void handleSend(e);
                  }
                }}
              />
              <div className="composer-btns">
                <button
                  type="submit"
                  className={`primary-btn${sending ? " stop-btn" : ""}`}
                  disabled={!sending && !input.trim()}
                >
                  {sending ? "중지" : "전송"}
                </button>
              </div>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
