export interface CharacterStage {
  minLevel: number;
  emoji: string;
  name: string;
}

export const CHARACTER_STAGES: CharacterStage[] = [
  { minLevel: 1, emoji: "🌱", name: "새싹" },
  { minLevel: 3, emoji: "🚶", name: "성장기" },
  { minLevel: 5, emoji: "💪", name: "숙련자" },
  { minLevel: 8, emoji: "⭐", name: "챔피언" },
  { minLevel: 12, emoji: "👑", name: "마스터" },
];

export const XP_PER_COMPLETION = 25;
export const XP_PER_LEVEL = 100;

export interface RoutineProgress {
  level: number;
  xp: number;
  xpInLevel: number;
  xpToNext: number;
  completedCount: number;
  stage: CharacterStage;
}

export function getCharacterStage(level: number): CharacterStage {
  let stage = CHARACTER_STAGES[0];
  for (const candidate of CHARACTER_STAGES) {
    if (level >= candidate.minLevel) stage = candidate;
  }
  return stage;
}

export function computeRoutineProgress(completedCount: number): RoutineProgress {
  const xp = completedCount * XP_PER_COMPLETION;
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const xpInLevel = xp % XP_PER_LEVEL;
  const xpToNext = XP_PER_LEVEL - xpInLevel;

  return {
    level,
    xp,
    xpInLevel,
    xpToNext: xpInLevel === 0 && completedCount > 0 ? XP_PER_LEVEL : xpToNext,
    completedCount,
    stage: getCharacterStage(level),
  };
}

export function countCompletedTasks(routine: {
  exerciseRoutine?: { isCompleted: boolean }[];
  nutritionRoutine?: { meals: { isCompleted: boolean }[] }[];
}): number {
  let count = 0;

  for (const item of routine.exerciseRoutine ?? []) {
    if (item.isCompleted) count += 1;
  }

  for (const day of routine.nutritionRoutine ?? []) {
    for (const meal of day.meals) {
      if (meal.isCompleted) count += 1;
    }
  }

  return count;
}
