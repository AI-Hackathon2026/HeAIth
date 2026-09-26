import type {
  ExerciseRoutineItem,
  NutritionMeal,
  NutritionRoutineDay,
  Routine,
} from "../types";

function preserveListOrderByPlanId<T extends { planId: string }>(
  previous: T[],
  next: T[],
): T[] {
  if (previous.length === 0) return next;

  const nextById = new Map(
    next.filter((item) => item.planId).map((item) => [item.planId, item]),
  );
  const ordered: T[] = [];
  const seen = new Set<string>();

  for (const item of previous) {
    if (!item.planId) continue;
    const updated = nextById.get(item.planId);
    if (updated) {
      ordered.push(updated);
      seen.add(item.planId);
    }
  }

  for (const item of next) {
    if (!item.planId || seen.has(item.planId)) continue;
    ordered.push(item);
  }

  return ordered.length > 0 ? ordered : next;
}

function preserveNutritionRoutineOrder(
  previous: NutritionRoutineDay[],
  next: NutritionRoutineDay[],
): NutritionRoutineDay[] {
  const nextByDay = new Map(
    next.map((day, index) => [day.dayNumber ?? index + 1, day]),
  );
  const orderedDays: NutritionRoutineDay[] = [];
  const seenDays = new Set<number>();

  for (const [index, prevDay] of previous.entries()) {
    const dayKey = prevDay.dayNumber ?? index + 1;
    const updatedDay = nextByDay.get(dayKey);
    if (!updatedDay) continue;

    orderedDays.push({
      ...updatedDay,
      meals: preserveListOrderByPlanId<NutritionMeal>(
        prevDay.meals,
        updatedDay.meals,
      ),
    });
    seenDays.add(dayKey);
  }

  for (const [index, day] of next.entries()) {
    const dayKey = day.dayNumber ?? index + 1;
    if (seenDays.has(dayKey)) continue;
    orderedDays.push(day);
  }

  return orderedDays.length > 0 ? orderedDays : next;
}

export function mergeRoutinePreservingPlanOrder(
  previous: Routine | null,
  next: Routine,
): Routine {
  if (!previous) return next;

  return {
    ...next,
    exerciseRoutine: next.exerciseRoutine
      ? preserveListOrderByPlanId<ExerciseRoutineItem>(
          previous.exerciseRoutine ?? [],
          next.exerciseRoutine,
        )
      : next.exerciseRoutine,
    nutritionRoutine: next.nutritionRoutine
      ? preserveNutritionRoutineOrder(
          previous.nutritionRoutine ?? [],
          next.nutritionRoutine,
        )
      : next.nutritionRoutine,
  };
}
