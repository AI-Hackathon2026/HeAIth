import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChatTab } from "./ChatTab";
import {
  getReaderChatRoomStyles,
  isTypingTarget,
  PANEL_TRANSITION_MS,
  type DocumentChatLayout,
} from "../utils/readerChatRoom";

interface Props {
  username: string;
  layout?: DocumentChatLayout;
  readerFullscreen?: boolean;
  stackZClass?: string;
  contextLabel?: string;
}

export function DocumentChatWidget({
  username,
  layout = "default",
  readerFullscreen = false,
  stackZClass = "document-chat-z-40",
  contextLabel,
}: Props) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roomStyles = getReaderChatRoomStyles({ layout, readerFullscreen });

  const openChat = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsChatOpen(true);
    requestAnimationFrame(() => setPanelVisible(true));
  }, []);

  const closeChat = useCallback(() => {
    setPanelVisible(false);
    closeTimerRef.current = setTimeout(() => {
      setIsChatOpen(false);
      closeTimerRef.current = null;
    }, PANEL_TRANSITION_MS);
  }, []);

  const toggleChat = useCallback(() => {
    if (isChatOpen && panelVisible) closeChat();
    else openChat();
  }, [closeChat, isChatOpen, openChat, panelVisible]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "/") return;
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      toggleChat();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleChat]);

  useEffect(() => {
    if (!isChatOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeChat();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeChat, isChatOpen]);

  useEffect(
    () => () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    },
    [],
  );

  const subtitle =
    contextLabel != null
      ? `Ask about “${contextLabel}” and related manuals`
      : "Ask about manuals and documents";

  return createPortal(
    <div className={`document-chat-root ${stackZClass}`}>
      {!isChatOpen && (
        <p className="document-chat-hint" aria-hidden>
          Press &quot;/&quot; to open AI chat
        </p>
      )}

      {!isChatOpen && (
        <button
          type="button"
          className={`document-chat-fab${layout === "reader" ? " document-chat-fab--reader" : ""}`}
          style={roomStyles.fab}
          aria-label="Open AI assistant"
          onClick={openChat}
        >
          <span className="document-chat-fab-icon" aria-hidden>
            📖
          </span>
          <span className="document-chat-fab-label">AI</span>
        </button>
      )}

      {isChatOpen && (
        <div
          className={`document-chat-panel${panelVisible ? " document-chat-panel--visible" : ""}${layout === "reader" ? " document-chat-panel--reader" : ""}`}
          style={roomStyles.panel}
          role="dialog"
          aria-modal="true"
          aria-label="AI Assistant"
        >
          <header className="document-chat-header">
            <div className="document-chat-header-copy">
              <span className="document-chat-header-icon" aria-hidden>
                📖
              </span>
              <div>
                <p className="document-chat-header-title">AI Assistant</p>
                <p className="document-chat-header-sub">{subtitle}</p>
              </div>
            </div>
            <button
              type="button"
              className="document-chat-close"
              aria-label="Close"
              onClick={closeChat}
            >
              ×
            </button>
          </header>

          <div
            className="document-chat-body"
            style={
              roomStyles.messageFontSize
                ? { fontSize: roomStyles.messageFontSize }
                : undefined
            }
          >
            <ChatTab
              username={username}
              variant="reader"
              contextLabel={contextLabel}
            />
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
