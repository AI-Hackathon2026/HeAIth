import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChatTab } from "./ChatTab";
import { HeAIthLogo } from "./HeAIthLogo";

interface Props {
  username: string;
}

export function ChatFabPopup({ username }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="chat-fab"
        aria-label="AI 건강 멘토 열기"
        onClick={() => setOpen(true)}
      >
        <span className="chat-fab-glow" aria-hidden />
        <span className="chat-fab-icon" aria-hidden>
          ✦
        </span>
      </button>

      {open &&
        createPortal(
          <div
            className="chat-popup-overlay"
            role="presentation"
            onClick={(event) => {
              if (event.target === event.currentTarget) setOpen(false);
            }}
          >
            <div
              className="chat-popup-panel"
              role="dialog"
              aria-modal="true"
              aria-label="AI 건강 멘토"
            >
              <header className="chat-popup-header">
                <div className="chat-popup-header-brand">
                  <HeAIthLogo size="sm" />
                  <span>AI 건강 멘토</span>
                </div>
                <button
                  type="button"
                  className="chat-popup-close"
                  aria-label="닫기"
                  onClick={() => setOpen(false)}
                >
                  ✕
                </button>
              </header>
              <div className="chat-popup-body">
                <ChatTab username={username} variant="popup" />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
