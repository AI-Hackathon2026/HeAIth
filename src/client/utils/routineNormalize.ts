import { DAY_OF_WEEK_ORDER } from "../constants/routine";
import type {
  CharacterProgress,
  ExerciseRoutineItem,
  MealType,
  NutritionMeal,
  NutritionRoutineDay,
  Routine,
  RoutineDifficulty,
  RoutineInfo,
  RoutineInfoItem,
  RoutineLog,
} from "../types";
import { extractCharacterProgress } from "./characterNormalize";
import { normalizeNutritionSummary } from "./nutritionSummary";

function clampProgress(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function normalizeMealType(raw: unknown): MealType {
  const value = String(raw ?? "BREAKFAST").toUpperCase();
  if (value === "LUNCH" || value === "DINNER" || value === "SNACK") {
    return value;
  }
  return "BREAKFAST";
}

function resolveRoutineSummary(source: Record<string, unknown>): string {
  const summary = String(source.summary ?? "").trim();
  if (summary) return summary;
  return String(source.report ?? "").trim();
}

function resolveReportReadme(source: Record<string, unknown>): string {
  return String(source.reportReadme ?? "").trim();
}

function hasRoutineTextField(source: Record<string, unknown>): boolean {
  return (
    Boolean(String(source.summary ?? "").trim()) ||
    Boolean(String(source.report ?? "").trim())
  );
}

function isRoutinePayloadObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const current = value as Record<string, unknown>;
  const routine = current.routine;
  return (
    Array.isArray(routine) ||
    Boolean(routine && typeof routine === "object") ||
    Boolean(current.exerciseRoutine) ||
    Boolean(current.nutritionRoutine) ||
    Boolean(current.id) ||
    Boolean(current.routineId) ||
    (Array.isArray(current.days) && current.days.length > 0) ||
    hasRoutineTextField(current)
  );
}

export function unwrapRoutineResponse(raw: unknown): Record<string, unknown> | null {
  if (Array.isArray(raw)) {
    const first = raw.find(isRoutinePayloadObject);
    return first ?? null;
  }

  if (!raw || typeof raw !== "object") return null;

  let current = raw as Record<string, unknown>;
  for (let depth = 0; depth < 4; depth += 1) {
    const routine = current.routine;
    if (
      Array.isArray(routine) ||
      (routine && typeof routine === "object") ||
      current.exerciseRoutine ||
      current.nutritionRoutine ||
      current.id ||
      current.routineId ||
      (Array.isArray(current.days) && current.days.length > 0) ||
      hasRoutineTextField(current)
    ) {
      return current;
    }

    const nested = current.data ?? current.result ?? current.payload ?? current.content;
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      current = nested as Record<string, unknown>;
      continue;
    }

    break;
  }

  return current;
}

export function collectRoutineEntries(
  data: Record<string, unknown>,
): Record<string, unknown>[] {
  const routine = data.routine;
  if (Array.isArray(routine)) {
    return routine.filter(
      (entry): entry is Record<string, unknown> =>
        Boolean(entry) && typeof entry === "object",
    );
  }
  if (routine && typeof routine === "object") {
    return [routine as Record<string, unknown>];
  }
  return [];
}

function normalizeExerciseRoutineItem(raw: unknown): ExerciseRoutineItem | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const task =
    item.task ??
    item.title ??
    item.name ??
    item.exerciseName ??
    item.description;
  if (typeof task !== "string" || !task.trim()) return null;

  return {
    planId: String(item.planId ?? item.id ?? item.exercisePlanId ?? ""),
    task: task.trim(),
    frequency: String(item.frequency ?? item.freq ?? ""),
    isCompleted: Boolean(item.isCompleted ?? item.completed),
    progressionBar: clampProgress(
      Number(
        item.progressionBar ??
          item.progressPercentage ??
          item.progress ??
          item.progression ??
          0,
      ),
    ),
  };
}

function normalizeNutritionPlanMeals(
  raw: unknown,
  fallbackPlanId?: string,
): NutritionMeal[] {
  if (!raw || typeof raw !== "object") return [];
  const plan = raw as Record<string, unknown>;
  const mealType = normalizeMealType(plan.mealType ?? plan.type);
  const mealPlanId = String(
    plan.id ?? plan.planId ?? plan.nutritionPlanId ?? fallbackPlanId ?? "",
  );
  const foodItemsRaw = plan.foodItems;

  if (Array.isArray(foodItemsRaw) && foodItemsRaw.length > 0) {
    const meals: NutritionMeal[] = [];

    for (const item of foodItemsRaw) {
      if (!item || typeof item !== "object") continue;
      const food = item as Record<string, unknown>;
      const name = String(food.name ?? food.food ?? "").trim();
      const planId = String(food.id ?? food.planId ?? "");
      if (!name || !planId) continue;

      meals.push({
        planId,
        mealPlanId: mealPlanId || undefined,
        mealType,
        foods: [name],
        calories: Number(food.calories ?? 0) || 0,
        isCompleted: Boolean(food.isCompleted ?? food.completed),
        progressionBar: clampProgress(
          Number(
            food.progressionBar ??
              food.progressPercentage ??
              food.progress ??
              0,
          ),
        ),
      });
    }

    return meals;
  }

  const legacyMeal = normalizeNutritionMeal(plan, mealPlanId);
  return legacyMeal ? [legacyMeal] : [];
}

function normalizeNutritionMeal(
  raw: unknown,
  fallbackPlanId?: string,
): NutritionMeal | null {
  if (!raw || typeof raw !== "object") return null;
  const meal = raw as Record<string, unknown>;
  const foodsRaw = meal.foods ?? meal.foodList ?? meal.items;
  let foods = Array.isArray(foodsRaw)
    ? foodsRaw.map((food) => String(food)).filter(Boolean)
    : typeof foodsRaw === "string"
      ? [foodsRaw]
      : [];

  if (foods.length === 0) {
    const text =
      meal.description ??
      meal.content ??
      meal.name ??
      meal.title ??
      meal.meal;
    if (typeof text === "string" && text.trim()) {
      foods = [text.trim()];
    }
  }

  return {
    planId: String(
      meal.planId ?? meal.id ?? meal.nutritionPlanId ?? fallbackPlanId ?? "",
    ),
    mealType: normalizeMealType(meal.mealType ?? meal.type),
    foods,
    calories: Number(meal.calories ?? meal.kcal ?? 0) || 0,
    isCompleted: Boolean(meal.isCompleted ?? meal.completed),
    progressionBar: clampProgress(
      Number(
        meal.progressionBar ??
          meal.progressPercentage ??
          meal.progress ??
          meal.progression ??
          0,
      ),
    ),
  };
}

function normalizeNutritionRoutineEntry(raw: unknown): NutritionRoutineDay | null {
  if (!raw || typeof raw !== "object") return null;
  const entry = raw as Record<string, unknown>;
  const dayPlanId = String(entry.planId ?? entry.id ?? entry.nutritionPlanId ?? "");
  const mealsRaw = entry.meals;

  if (Array.isArray(mealsRaw)) {
    const meals = mealsRaw
      .map((meal) => normalizeNutritionMeal(meal, dayPlanId))
      .filter((meal): meal is NutritionMeal => meal !== null);
    if (meals.length === 0) return null;
    return { planId: dayPlanId || undefined, meals };
  }

  const flatMeal = normalizeNutritionMeal(entry, dayPlanId);
  if (flatMeal) {
    return { planId: dayPlanId || undefined, meals: [flatMeal] };
  }

  return null;
}

function normalizeRoutineLog(raw: unknown): RoutineLog {
  const log = raw as Record<string, unknown>;
  const date =
    typeof log.date === "string"
      ? log.date
      : typeof log.logDate === "string"
        ? log.logDate
        : log.logDate instanceof Date
          ? log.logDate.toISOString()
          : String(log.logDate ?? "");
  return {
    id: log.id as string | undefined,
    date,
    completed: Boolean(log.completed),
  };
}

function extractRoutineIdFromDays(data: Record<string, unknown>): string {
  const days = Array.isArray(data.days) ? data.days : [];
  for (const dayRaw of days) {
    if (!dayRaw || typeof dayRaw !== "object") continue;
    const day = dayRaw as Record<string, unknown>;
    const dailyId = day.dailyRoutineId ?? day.routineId ?? day.id;
    if (dailyId != null && String(dailyId).trim()) {
      return String(dailyId).trim();
    }
  }
  return "";
}

function sortWeeklyDayEntries(
  days: unknown[],
): Record<string, unknown>[] {
  const entries = days.filter(
    (day): day is Record<string, unknown> =>
      Boolean(day) && typeof day === "object",
  );

  return [...entries].sort((a, b) => {
    const dayA = String(a.dayOfWeek ?? "");
    const dayB = String(b.dayOfWeek ?? "");
    const indexA = DAY_OF_WEEK_ORDER.indexOf(
      dayA as (typeof DAY_OF_WEEK_ORDER)[number],
    );
    const indexB = DAY_OF_WEEK_ORDER.indexOf(
      dayB as (typeof DAY_OF_WEEK_ORDER)[number],
    );
    const safeA = indexA === -1 ? DAY_OF_WEEK_ORDER.length : indexA;
    const safeB = indexB === -1 ? DAY_OF_WEEK_ORDER.length : indexB;
    return safeA - safeB;
  });
}

function normalizeWeeklyDaysFormat(data: Record<string, unknown>): {
  exerciseRoutine: ExerciseRoutineItem[];
  nutritionRoutine: NutritionRoutineDay[];
  routineId: string;
} {
  const days = sortWeeklyDayEntries(Array.isArray(data.days) ? data.days : []);
  const exerciseRoutine: ExerciseRoutineItem[] = [];
  const nutritionRoutine: NutritionRoutineDay[] = [];
  let routineId = extractRoutineIdFromDays(data);

  days.forEach((day, dayIndex) => {
    const dayOfWeek = String(day.dayOfWeek ?? "");
    const dayNumber = dayIndex + 1;
    const dayPlanId = String(day.dailyRoutineId ?? day.id ?? "");

    const nutritionPlans = Array.isArray(day.nutritionPlans)
      ? day.nutritionPlans
      : [];
    const meals = nutritionPlans.flatMap((plan) =>
      normalizeNutritionPlanMeals(plan, dayPlanId),
    );
    if (meals.length > 0) {
      const averageCaloriesRaw = Number(day.averageCalories ?? day.average_calories);
      const averageCalories =
        !Number.isNaN(averageCaloriesRaw) && averageCaloriesRaw > 0
          ? Math.round(averageCaloriesRaw)
          : undefined;

      nutritionRoutine.push({
        planId: dayPlanId || undefined,
        dayOfWeek: dayOfWeek || undefined,
        dayNumber,
        meals,
        averageCalories,
        nutritionSummary: normalizeNutritionSummary(day.nutritionSummary),
        nutritionQualityScore: clampProgress(
          Number(day.nutritionQualityScore ?? day.nutrition_quality_score ?? 0),
        ) || undefined,
      });
    }

    const exercisePlans = Array.isArray(day.exercisePlans)
      ? day.exercisePlans
      : Array.isArray(day.workoutPlans)
        ? day.workoutPlans
        : [];
    for (const plan of exercisePlans) {
      const item = normalizeExerciseRoutineItem(plan);
      if (item) {
        exerciseRoutine.push({
          ...item,
          dayOfWeek: dayOfWeek || undefined,
          dayNumber,
        });
      }
    }
  });

  if (!routineId) {
    const firstPlanId =
      nutritionRoutine[0]?.meals[0]?.planId ?? exerciseRoutine[0]?.planId;
    if (firstPlanId) routineId = firstPlanId;
  }

  return { exerciseRoutine, nutritionRoutine, routineId };
}

function extractRoutineId(
  data: Record<string, unknown>,
  routineEntries: Record<string, unknown>[],
): string {
  const candidates = [
    data.id,
    data.routineId,
    data._id,
    extractRoutineIdFromDays(data),
    ...routineEntries.flatMap((entry) => [entry.id, entry.routineId, entry._id]),
  ];

  for (const candidate of candidates) {
    if (candidate != null && String(candidate).trim()) {
      return String(candidate).trim();
    }
  }

  return "";
}

function normalizeDifficulty(raw: unknown): RoutineDifficulty | null {
  const value = String(raw ?? "").toUpperCase();
  if (value === "EASY" || value === "MODERATE" || value === "HARD") {
    return value;
  }
  return null;
}

function normalizeRoutineInfoItem(raw: unknown): RoutineInfoItem | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const name = String(item.name ?? "").trim();
  if (!name) return null;
  return {
    name,
    tooltip: String(item.tooltip ?? "").trim(),
  };
}

function normalizeRoutineInfo(raw: unknown): RoutineInfo | null {
  if (raw == null) return null;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const info = raw as Record<string, unknown>;
  const nutrition = Array.isArray(info.nutrition)
    ? info.nutrition
        .map(normalizeRoutineInfoItem)
        .filter((item): item is RoutineInfoItem => item !== null)
    : [];
  const workout = Array.isArray(info.workout)
    ? info.workout
        .map(normalizeRoutineInfoItem)
        .filter((item): item is RoutineInfoItem => item !== null)
    : [];
  const sources = Array.isArray(info.sources)
    ? info.sources.map((source) => String(source).trim()).filter(Boolean)
    : [];
  const reason = String(info.reason ?? "").trim();

  if (!reason && nutrition.length === 0 && workout.length === 0) {
    return null;
  }

  return { reason, nutrition, workout, sources };
}

export function routineResponseHasContent(raw: unknown): boolean {
  const data = unwrapRoutineResponse(raw);
  if (!data) return false;

  if (extractRoutineId(data, collectRoutineEntries(data))) return true;
  if (collectRoutineEntries(data).length > 0) return true;
  if (Array.isArray(data.exerciseRoutine) && data.exerciseRoutine.length > 0) {
    return true;
  }
  if (Array.isArray(data.nutritionRoutine) && data.nutritionRoutine.length > 0) {
    return true;
  }
  if (String(data.nutritionPlan ?? "").trim()) return true;
  if (String(data.workoutPlan ?? "").trim()) return true;
  if (String(data.title ?? "").trim()) return true;
  if (Array.isArray(data.days) && data.days.length > 0) return true;
  if (hasRoutineTextField(data)) return true;
  if (Array.isArray(data.tasks) && data.tasks.length > 0) return true;
  if (data.nutritionSummary && typeof data.nutritionSummary === "object") {
    return true;
  }
  if (data.workoutSummary && typeof data.workoutSummary === "object") {
    return true;
  }

  return false;
}

export function normalizeRoutine(raw: unknown): Routine | null {
  const data = unwrapRoutineResponse(raw);
  if (!data) return null;

  const routineEntries = collectRoutineEntries(data);
  const trackerSource = routineEntries[0] ?? data;
  const merged = { ...trackerSource, ...data };

  const weeklyDays = normalizeWeeklyDaysFormat(data);

  const exerciseRoutine = (
    weeklyDays.exerciseRoutine.length > 0
      ? weeklyDays.exerciseRoutine
      : (
          Array.isArray(trackerSource.exerciseRoutine)
            ? trackerSource.exerciseRoutine
            : Array.isArray(data.exerciseRoutine)
              ? data.exerciseRoutine
              : []
        )
          .map(normalizeExerciseRoutineItem)
          .filter((item): item is ExerciseRoutineItem => item !== null)
  );

  const nutritionRoutine = (
    weeklyDays.nutritionRoutine.length > 0
      ? weeklyDays.nutritionRoutine
      : (
          Array.isArray(trackerSource.nutritionRoutine)
            ? trackerSource.nutritionRoutine
            : Array.isArray(data.nutritionRoutine)
              ? data.nutritionRoutine
              : []
        )
          .map(normalizeNutritionRoutineEntry)
          .filter((day): day is NutritionRoutineDay => day !== null)
  );

  const summaryText = resolveRoutineSummary(merged);
  const reportReadme = resolveReportReadme(merged);
  const routineInfo = normalizeRoutineInfo(merged.routineInfo);

  const hasTrackerData =
    exerciseRoutine.length > 0 || nutritionRoutine.length > 0;
  const hasLegacyContent =
    String(merged.nutritionPlan ?? "").trim().length > 0 ||
    String(merged.workoutPlan ?? "").trim().length > 0;
  const hasRoutineEntries = routineEntries.length > 0;
  const hasWeeklyDays = Array.isArray(data.days) && data.days.length > 0;
  const hasRoutinePayload =
    hasTrackerData ||
    hasLegacyContent ||
    hasRoutineEntries ||
    hasWeeklyDays ||
    summaryText.length > 0 ||
    Boolean(String(merged.title ?? "").trim());

  const resolvedId =
    extractRoutineId(data, routineEntries) || weeklyDays.routineId;

  if (!resolvedId && !hasRoutinePayload) {
    return null;
  }

  const difficulty =
    normalizeDifficulty(merged.difficulty ?? trackerSource.difficulty) ??
    "MODERATE";

  const logsRaw = merged.logs;
  const logs = Array.isArray(logsRaw)
    ? logsRaw.map(normalizeRoutineLog)
    : undefined;

  const chatsRaw = merged.chats;
  const chats = Array.isArray(chatsRaw)
    ? chatsRaw
        .filter(
          (chat): chat is Record<string, unknown> =>
            Boolean(chat) && typeof chat === "object",
        )
        .map((chat) => ({ id: String(chat.id ?? "") }))
        .filter((chat) => chat.id)
    : undefined;

  const characterProgress: CharacterProgress | undefined =
    extractCharacterProgress(data) ?? undefined;

  return {
    id: resolvedId,
    difficulty,
    summary: summaryText,
    reportReadme,
    routineInfo,
    title: String(merged.title ?? summaryText.slice(0, 80) ?? ""),
    nutritionPlan: String(merged.nutritionPlan ?? summaryText),
    workoutPlan: String(merged.workoutPlan ?? summaryText),
    isActive: Boolean(merged.isActive ?? merged.is_active ?? true),
    exerciseRoutine,
    nutritionRoutine,
    trackerCompleted: Boolean(
      trackerSource.isCompleted ?? merged.isCompleted ?? merged.trackerCompleted ?? false,
    ),
    logs,
    chats,
    characterProgress,
  };
}

export function parseRoutineMeResponse(raw: unknown): Routine | null {
  const normalized = normalizeRoutine(raw);
  if (normalized) return normalized;
  if (!routineResponseHasContent(raw)) return null;

  const data = unwrapRoutineResponse(raw)!;
  const routineEntries = collectRoutineEntries(data);
  const trackerSource = routineEntries[0] ?? data;

  const weeklyDays = normalizeWeeklyDaysFormat(data);
  const merged = { ...trackerSource, ...data };
  const summaryText = resolveRoutineSummary(merged);
  const reportReadme = resolveReportReadme(merged);
  const routineInfo = normalizeRoutineInfo(merged.routineInfo);

  return {
    id: extractRoutineId(data, routineEntries) || weeklyDays.routineId,
    difficulty:
      normalizeDifficulty(trackerSource.difficulty ?? data.difficulty) ??
      "MODERATE",
    summary: summaryText,
    reportReadme,
    routineInfo,
    title: String(data.title ?? trackerSource.title ?? summaryText.slice(0, 80)),
    nutritionPlan: String(
      data.nutritionPlan ?? trackerSource.nutritionPlan ?? summaryText,
    ),
    workoutPlan: String(
      data.workoutPlan ?? trackerSource.workoutPlan ?? summaryText,
    ),
    exerciseRoutine: weeklyDays.exerciseRoutine,
    nutritionRoutine: weeklyDays.nutritionRoutine,
    isActive: Boolean(data.isActive ?? data.is_active ?? true),
    trackerCompleted: Boolean(trackerSource.isCompleted ?? data.isCompleted ?? false),
    logs: undefined,
    chats: undefined,
    characterProgress: extractCharacterProgress(data) ?? undefined,
  };
}
