import { DIFFICULTY_LABELS } from "../../../constants/routine";
import type { RoutineDifficulty } from "../../../types";
import type { AvatarData } from "../../../utils/avatarData";
import { AvatarCard } from "../../avatar/AvatarCard";
import { DifficultyBadge } from "./DifficultyBadge";

interface Props {
  difficulty: RoutineDifficulty;
  summary: string;
  hasInfo: boolean;
  avatar: AvatarData;
  leveledUp?: boolean;
  onHealthRecord: () => void;
  onOpenInfo: () => void;
  onCharacterUpdated?: () => void;
}

export function RoutineViewHeader({
  difficulty,
  summary,
  hasInfo,
  avatar,
  leveledUp = false,
  onHealthRecord,
  onOpenInfo,
  onCharacterUpdated,
}: Props) {
  return (
    <header className="routine-v2-header">
      <div className="routine-v2-header-top">
        <div className="routine-v2-header-title-row">
          <h1 className="routine-v2-header-title">나의 루틴</h1>
          <DifficultyBadge difficulty={difficulty} />
        </div>
        <button
          type="button"
          className="routine-v2-health-btn"
          onClick={onHealthRecord}
        >
          내 건강 현황
        </button>
      </div>

      <div className="routine-v2-header-hero">
        <AvatarCard
          avatar={avatar}
          routineSummary={summary}
          difficulty={DIFFICULTY_LABELS[difficulty]}
          leveledUp={leveledUp}
          onCharacterUpdated={onCharacterUpdated}
        />
        {hasInfo && (
          <button
            type="button"
            className="routine-v2-info-btn routine-v2-info-btn--hero"
            aria-label="루틴 설명 보기"
            onClick={onOpenInfo}
          >
            ⓘ
          </button>
        )}
      </div>
    </header>
  );
}
