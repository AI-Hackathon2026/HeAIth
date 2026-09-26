import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { UpdatedRoutine } from "../../types/routine-chat.types";
import { HealthPulseMark } from "../HealthPulseMark";
import { RoutineChatScreen } from "./RoutineChatScreen";

interface Props {
  chatId: string | null;
  onRoutineUpdate: (routine: UpdatedRoutine) => void;
  onChatIdResolved?: (chatId: string) => void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    target.isContentEditable
  );
}

export function RoutineChatFabPopup({
  chatId,
  onRoutineUpdate,
  onChatIdResolved,
}: Props) {
  const [open, setOpen] = useState(false);
  const [resolvedChatId, setResolvedChatId] = useState<string | null>(chatId);

  useEffect(() => {
    setResolvedChatId(chatId);
  }, [chatId]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && open) {
        setOpen(false);
        return;
      }

      if (event.key !== "/") return;
      if (isEditableTarget(event.target)) return;

      event.preventDefault();
      setOpen((prev) => !prev);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function handleChatIdResolved(id: string) {
    setResolvedChatId(id);
    onChatIdResolved?.(id);
  }

  const fab = !open ? (
    <div className="chat-fab-anchor chat-fab-anchor--routine">
      <span className="chat-fab-hint">
        <kbd className="chat-fab-hint-key">/</kbd> AI 상담
      </span>
      <button
        type="button"
        className="chat-fab chat-fab--routine"
        aria-label="AI 루틴 상담 열기"
        aria-keyshortcuts="/"
        onClick={() => setOpen(true)}
      >
        <HealthPulseMark size="xs" bpm={30} className="chat-fab-pulse" />
      </button>
    </div>
  ) : null;

  return (
    <>
      {fab && createPortal(fab, document.body)}

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
              className="chat-popup-panel chat-popup-panel--routine"
              role="dialog"
              aria-modal="true"
              aria-label="AI 루틴 상담"
            >
              <header className="chat-popup-header">
                <div className="chat-popup-header-brand">
                  <span>AI 루틴 상담</span>
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
              <div className="chat-popup-body chat-popup-body--routine">
                <RoutineChatScreen
                  chatId={resolvedChatId}
                  variant="popup"
                  onClose={() => setOpen(false)}
                  onRoutineUpdate={onRoutineUpdate}
                  onChatIdResolved={handleChatIdResolved}
                />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
