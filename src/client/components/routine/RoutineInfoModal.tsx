import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { RoutineInfo } from "../../types";
import { RoutineInfoBody } from "./RoutineInfoBody";

interface Props {
  open: boolean;
  onClose: () => void;
  routineInfo: RoutineInfo | null;
  summary: string;
  onRegenerate?: () => void;
}

export function RoutineInfoModal({
  open,
  onClose,
  routineInfo,
  summary,
  onRegenerate,
}: Props) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="routine-v2-sheet-overlay"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="routine-v2-sheet routine-info-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="routine-info-modal-title"
      >
        <div className="routine-v2-sheet-handle" aria-hidden />

        <header className="routine-v2-sheet-header routine-info-modal-header">
          <h2 id="routine-info-modal-title">왜 이 루틴인가요?</h2>
          <button
            type="button"
            className="routine-v2-sheet-close"
            aria-label="닫기"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        {summary && <p className="routine-info-modal-summary">{summary}</p>}

        <div className="routine-info-modal-body">
          {routineInfo ? (
            <RoutineInfoBody info={routineInfo} />
          ) : (
            <div className="routine-info-legacy">
              <p>이 루틴은 이전 버전으로 생성되어 상세 설명이 없어요.</p>
              {onRegenerate && (
                <button
                  type="button"
                  className="routine-info-regenerate-btn"
                  onClick={() => {
                    onClose();
                    onRegenerate();
                  }}
                >
                  새 루틴 생성하기
                </button>
              )}
            </div>
          )}
        </div>

        {routineInfo && routineInfo.sources.length > 0 && (
          <footer className="routine-info-modal-footer">
            <span aria-hidden>📄</span>
            <span>출처: {routineInfo.sources.join(" · ")}</span>
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
