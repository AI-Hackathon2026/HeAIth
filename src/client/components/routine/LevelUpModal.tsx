import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { Gender } from "../../types";
import type { RoutineProgress } from "../../utils/routineProgress";
import { RoutineAvatar } from "./RoutineAvatar";

interface Props {
  progress: RoutineProgress;
  gender: Gender;
  bmi: number;
  obesityRate: number;
  onDismiss: () => void;
}

export function LevelUpModal({
  progress,
  gender,
  bmi,
  obesityRate,
  onDismiss,
}: Props) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onDismiss();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onDismiss]);

  return createPortal(
    <div
      className="routine-levelup-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="levelup-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onDismiss();
      }}
    >
      <div className="routine-levelup-card">
        <RoutineAvatar
          gender={gender}
          bmi={bmi}
          obesityRate={obesityRate}
          progress={progress}
          size="lg"
        />
        <h3 id="levelup-title">레벨 업!</h3>
        <p className="routine-levelup-level">
          Lv.{Math.max(1, progress.level - 1)} → Lv.{progress.level}
        </p>
        <p className="routine-levelup-stage">
          아바타가 <strong>{progress.stage.name}</strong>(으)로 더 건강해졌어요
        </p>
        <button type="button" className="primary-btn" onClick={onDismiss}>
          계속하기
        </button>
      </div>
    </div>,
    document.body,
  );
}
