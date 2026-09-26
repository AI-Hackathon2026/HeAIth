import {
  AVATAR_MAX_LEVEL,
  AVATAR_XP_PER_LEVEL,
  LEVEL_BADGES,
  LEVEL_LABELS,
} from "../constants/avatar.constants";
import { heroStyleKeyToId } from "../constants/heroAvatar.constants";
import type { CharacterProgress } from "../types";
import { countCompletedTasks, XP_PER_COMPLETION } from "./routineProgress";

export interface AvatarData {
  level: number;
  xp: number;
  label: string;
  badges: string[];
  heroStyleId: number;
  xpToNext: { current: number; required: number; percent: number };
}

export function toAvatarLevel(characterLevel: number): number {
  return Math.min(AVATAR_MAX_LEVEL, Math.max(1, characterLevel));
}

export function avatarLevelIncreased(
  previousLevel: number,
  nextLevel: number,
): boolean {
  return toAvatarLevel(nextLevel) > toAvatarLevel(previousLevel);
}

export function toAvatarData(progress: CharacterProgress): AvatarData {
  const level = toAvatarLevel(progress.level);
  const required = AVATAR_XP_PER_LEVEL;
  const current = progress.xpInLevel;
  const percent =
    level >= AVATAR_MAX_LEVEL
      ? 100
      : Math.min(100, Math.round((current / required) * 100));

  return {
    level,
    xp: progress.xp,
    label: LEVEL_LABELS[level] ?? LEVEL_LABELS[1],
    badges: LEVEL_BADGES[level] ?? [],
    heroStyleId: heroStyleKeyToId(progress.heroStyle),
    xpToNext: { current, required, percent },
  };
}

export function defaultCharacterProgress(): CharacterProgress {
  return {
    level: 1,
    xp: 0,
    xpInLevel: 0,
    xpToNext: AVATAR_XP_PER_LEVEL,
    totalCompletions: 0,
    stage: { name: "새싹", emoji: "🌱" },
    heroStyle: "IRON",
  };
}

type RoutineTaskSource = {
  exerciseRoutine?: { isCompleted: boolean }[];
  nutritionRoutine?: { meals: { isCompleted: boolean }[] }[];
};

export function characterProgressFromRoutine(
  routine: RoutineTaskSource,
): CharacterProgress {
  const totalCompletions = countCompletedTasks(routine);
  const xp = totalCompletions * XP_PER_COMPLETION;
  const level = toAvatarLevel(Math.floor(xp / AVATAR_XP_PER_LEVEL) + 1);
  const xpInLevel = xp % AVATAR_XP_PER_LEVEL;

  return {
    level,
    xp,
    xpInLevel,
    xpToNext:
      level >= AVATAR_MAX_LEVEL
        ? 0
        : xpInLevel === 0 && totalCompletions > 0
          ? AVATAR_XP_PER_LEVEL
          : AVATAR_XP_PER_LEVEL - xpInLevel,
    totalCompletions,
    stage: defaultCharacterProgress().stage,
    heroStyle: defaultCharacterProgress().heroStyle,
  };
}

export function reconcileCharacterProgress(
  backend: CharacterProgress | undefined | null,
  routine: RoutineTaskSource,
  current?: CharacterProgress,
): CharacterProgress {
  const fromTasks = characterProgressFromRoutine(routine);
  const candidates = [current, backend, fromTasks].filter(
    (progress): progress is CharacterProgress => progress != null,
  );

  return candidates.reduce((best, candidate) =>
    candidate.xp > best.xp ? candidate : best,
  );
}

function isPlaceholderCharacterProgress(progress: CharacterProgress): boolean {
  return progress.xp === 0 && progress.totalCompletions === 0;
}

export function resolveCharacterProgressAfterTask(
  reward: CharacterProgress | undefined,
  routine: RoutineTaskSource,
  previous: CharacterProgress,
  fallback?: CharacterProgress | null,
): CharacterProgress {
  const candidates: CharacterProgress[] = [];

  if (reward && !isPlaceholderCharacterProgress(reward)) {
    candidates.push(reward);
  }
  if (fallback) candidates.push(fallback);
  candidates.push(previous);
  candidates.push(characterProgressFromRoutine(routine));

  return candidates.reduce((best, candidate) =>
    candidate.xp > best.xp ? candidate : best,
  );
}
