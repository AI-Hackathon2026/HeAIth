import { DIFFICULTY_LABELS } from "../../../constants/routine";
import type { RoutineDifficulty } from "../../../types";

const DIFFICULTY_COLORS: Record<
  RoutineDifficulty,
  { bg: string; border: string; text: string }
> = {
  EASY: {
    bg: "rgba(0,201,167,0.12)",
    border: "rgba(0,201,167,0.4)",
    text: "#00c9a7",
  },
  MODERATE: {
    bg: "rgba(0,201,167,0.12)",
    border: "rgba(0,201,167,0.4)",
    text: "#00c9a7",
  },
  HARD: {
    bg: "rgba(255,107,107,0.12)",
    border: "rgba(255,107,107,0.4)",
    text: "#ff6b6b",
  },
};

interface Props {
  difficulty: RoutineDifficulty;
}

export function DifficultyBadge({ difficulty }: Props) {
  const colors = DIFFICULTY_COLORS[difficulty];
  return (
    <span
      className="routine-v2-difficulty-badge"
      style={{
        background: colors.bg,
        borderColor: colors.border,
        color: colors.text,
      }}
    >
      {DIFFICULTY_LABELS[difficulty]}
    </span>
  );
}
