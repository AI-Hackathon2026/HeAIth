import { DayOfWeekType, Difficulty, MealType } from "@/server/shared/types/enums";
import { CharacterProgressView } from "./character.view";

export interface PlanProgressView {
    isCompleted: boolean;
    progressionBar: number;
}

export interface NutritionFoodItemView extends PlanProgressView {
    id: string;
    name: string;
    calories: number;
}

export interface NutritionPlanItemView extends PlanProgressView {
    id: string;
    mealType: MealType;
    calories: number;
    foodItems: NutritionFoodItemView[];
    /** Derived from foodItems for backward compatibility. */
    foods: string[];
}

export interface ExercisePlanItemView extends PlanProgressView {
    id: string;
    task: string;
    frequency: string;
}

export interface DailyRoutineScheduleView {
    dayOfWeek: DayOfWeekType;
    dailyRoutineId: string;
    nutritionPlans: NutritionPlanItemView[];
    exercisePlans: ExercisePlanItemView[];
    nutritionSummary: NutritionSummary;
    /** 0–100 overall nutrition quality (separate from compositional shares). */
    nutritionQualityScore: number;
    averageCalories: number;
    isCompleted: boolean;
}

export interface RoutineScheduleView {
    /** One-sentence description of the current routine. */
    summary: string;
    /** Markdown readme: per-food nutrients, exercise design, chronic-disease prevention, page citations. */
    reportReadme: string;
    /** @deprecated Use `summary`. Kept for backward compatibility. */
    report: string;
    difficulty: Difficulty;
    days: DailyRoutineScheduleView[];
}

export interface RoutineMeView extends RoutineScheduleView {
    characterProgress: CharacterProgressView;
}

export interface PlanProgressUpdateView extends PlanProgressView {
    id: string;
    characterProgress: CharacterProgressView;
    leveledUp: boolean;
    previousLevel: number;
}

export interface ExerciseRoutineEntry {
    task: string;
    frequency: string;
    isCompleted: boolean;
    progressionBar: number;
}

export interface RoutineFoodItemPlan {
    name: string;
    calories: number;
}

export interface RoutineMealPlan {
    mealType: MealType;
    foods: string[];
    foodItems: RoutineFoodItemPlan[];
    calories: number;
    isCompleted: boolean;
    progressionBar: number;
}

export interface NutritionSummary {
    "vitamin A": string;
    "vitamin C": string;
    "vitamin D": string;
    calcium: string;
    protein: string;
    carbohydrates: string;
    fat: string;
    fiber: string;
    sugar: string;
    sodium: string;
    cholesterol: string;
}

/** Full nutrition plan for one slot (`nutritionRoutine` item). */
export interface NutritionRoutineDay {
    meals: RoutineMealPlan[]
    averageCalories: number;
    nutritionSummary: NutritionSummary;
}

export interface RoutineDayPlan {
    exerciseRoutine: ExerciseRoutineEntry[];
    nutritionRoutine: NutritionRoutineDay[];
    isCompleted: boolean;
}

export type WeeklyRoutine = RoutineDayPlan[];

export interface RoutinePayload {
    summary: string;
    reportReadme: string;
    /** @deprecated Use `summary`. */
    report: string;
    routine: WeeklyRoutine;
    days: DayOfWeekType[];
    difficulty: Difficulty;
}

export interface RoutineResultView {
    routineId: string;
    chatId: string;
    summary: string;
    reportReadme: string;
    /** @deprecated Use `summary`. */
    report: string;
    routine: WeeklyRoutine;
    days: DayOfWeekType[];
    difficulty: Difficulty;
}

export interface TaskLogResultView {
    task: import("./health-record.view").RoutineTaskView;
    progress: import("./health-record.view").RoutineProgressView;
}

export interface RoutineProgressHistoryView {
    todayCompleted: number;
    todayTotal: number;
    todayPercent: number;
    weekCompleted: number;
    weekTarget: number;
    streakDays: number;
    completionHistory: Array<{
        date: string;
        completedTasks: number;
        totalTasks: number;
    }>;
}

/** Zip `days` with each `routine` entry for persistence / iteration. */
export type RoutineDayWithPlan = {
    dayOfWeek: DayOfWeekType;
    dayPlan: RoutineDayPlan;
};
