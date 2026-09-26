import type { Gender } from "../../types";
import type { RoutineProgress } from "../../utils/routineProgress";
import { RoutineAvatar } from "./RoutineAvatar";

interface Props {
  progress: RoutineProgress;
  gender: Gender;
  bmi: number;
  obesityRate: number;
  showAvatar?: boolean;
}

export function RoutineCharacter({
  progress,
  gender,
  bmi,
  obesityRate,
  showAvatar = true,
}: Props) {
  const { stage, level, xpInLevel, xpToNext } = progress;
  const pct = Math.min(100, Math.round((xpInLevel / 100) * 100));

  return (
    <div className="routine-character-panel">
      {showAvatar && (
        <RoutineAvatar
          gender={gender}
          bmi={bmi}
          obesityRate={obesityRate}
          progress={progress}
          size="sm"
        />
      )}
      <div className="routine-character-info">
        <div className="routine-character-meta">
          <span className="routine-character-name">{stage.name}</span>
          <span className="routine-character-level">Lv.{level}</span>
        </div>
        <div
          className="routine-character-xp-bar"
          role="progressbar"
          aria-valuenow={xpInLevel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`경험치 ${xpInLevel} / 100`}
        >
          <div
            className="routine-character-xp-fill"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="routine-character-xp-label">
          다음 레벨까지 {xpToNext} XP · 완료 {progress.completedCount}회
        </span>
      </div>
    </div>
  );
}
