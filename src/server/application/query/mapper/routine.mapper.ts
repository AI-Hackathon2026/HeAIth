import { DayOfWeekType, Difficulty, MealType, NutritionSummary as DbNutritionSummary } from "@/server/shared/types/enums";
import {
    DailyRoutineScheduleView,
    ExercisePlanItemView,
    NutritionFoodItemView,
    NutritionPlanItemView,
    NutritionSummary,
    RoutineScheduleView,
} from "../view/routine.view";
import { toPlanProgress } from "../../../shared/utils/plan-progress.util";
import {
    computeNutritionSummaryFromMeals,
    computeNutritionQualityScore,
    rebalanceNutritionSummary,
} from "../../../shared/utils/nutrition-summary.util";

const DAY_ORDER: DayOfWeekType[] = [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
    "SUNDAY",
];

const MEAL_ORDER: MealType[] = ["BREAKFAST", "LUNCH", "DINNER"];

const EMPTY_NUTRITION_SUMMARY: NutritionSummary = {
    "vitamin A": "0%",
    "vitamin C": "0%",
    "vitamin D": "0%",
    calcium: "0%",
    protein: "0%",
    carbohydrates: "0%",
    fat: "0%",
    fiber: "0%",
    sugar: "0%",
    sodium: "0%",
    cholesterol: "0%",
};

type NutritionFoodItemRow = {
    id: string;
    name: string;
    calories: number;
    sortOrder: number;
    progressPercentage: number;
};

type NutritionPlanRow = {
    id: string;
    mealType: MealType;
    calories: number;
    progressPercentage: number;
    foodItems: NutritionFoodItemRow[];
};

type ExercisePlanRow = {
    id: string;
    exercises: unknown;
    progressPercentage: number;
};

type DailyRoutineRow = {
    id: string;
    dayOfWeek: DayOfWeekType;
    nutritionPlans: NutritionPlanRow[];
    exercisePlans: ExercisePlanRow[];
    nutritionSummary: DbNutritionSummary | null;
};

type RoutineRow = {
    report: string;
    summary: string;
    reportReadme: string;
    difficulty: Difficulty;
    dailyRoutines: DailyRoutineRow[];
};

function formatMacroPercent(value: number): string {
    return `${Math.round(value)}%`;
}

function toNutritionSummaryView(
    summary: DbNutritionSummary | null,
    nutritionPlans: NutritionPlanRow[],
): NutritionSummary {
    if (nutritionPlans.length > 0) {
        return computeNutritionSummaryFromMeals(
            nutritionPlans.map((plan) => ({
                foods: plan.foodItems
                    .slice()
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((item) => item.name),
                calories: plan.calories,
            })),
        );
    }

    if (!summary) return EMPTY_NUTRITION_SUMMARY;

    return rebalanceNutritionSummary({
        "vitamin A": formatMacroPercent(summary.vitaminA),
        "vitamin C": formatMacroPercent(summary.vitaminC),
        "vitamin D": formatMacroPercent(summary.vitaminD),
        calcium: formatMacroPercent(summary.calcium),
        protein: formatMacroPercent(summary.protein),
        carbohydrates: formatMacroPercent(summary.carbohydrates),
        fat: formatMacroPercent(summary.fat),
        fiber: formatMacroPercent(summary.fiber),
        sugar: formatMacroPercent(summary.sugar),
        sodium: formatMacroPercent(summary.sodium),
        cholesterol: formatMacroPercent(summary.cholesterol),
    });
}

function toNutritionFoodItem(item: NutritionFoodItemRow): NutritionFoodItemView {
    return {
        id: item.id,
        name: item.name,
        calories: item.calories,
        ...toPlanProgress(item.progressPercentage),
    };
}

function toNutritionPlanItem(plan: NutritionPlanRow): NutritionPlanItemView {
    const orderedItems = [...plan.foodItems].sort((a, b) => a.sortOrder - b.sortOrder);
    const foodItems = orderedItems.map(toNutritionFoodItem);

    return {
        id: plan.id,
        mealType: plan.mealType,
        calories: plan.calories,
        foodItems,
        foods: orderedItems.map((item) => item.name),
        ...toPlanProgress(plan.progressPercentage),
    };
}

function sumMealCalories(plans: NutritionPlanRow[]): number {
    return plans.reduce((sum, plan) => sum + plan.calories, 0);
}

function toExercisePlanItem(plan: ExercisePlanRow): ExercisePlanItemView {
    const entry = (plan.exercises ?? {}) as Record<string, unknown>;

    return {
        id: plan.id,
        task: String(entry.task ?? entry.name ?? ""),
        frequency: String(entry.frequency ?? entry.freq ?? "1회"),
        ...toPlanProgress(plan.progressPercentage),
    };
}

function isNutritionPlanCompleted(plan: NutritionPlanRow): boolean {
    if (plan.foodItems.length === 0) {
        return toPlanProgress(plan.progressPercentage).isCompleted;
    }

    return plan.foodItems.every(
        (item) => toPlanProgress(item.progressPercentage).isCompleted,
    );
}

function toDailySchedule(daily: DailyRoutineRow): DailyRoutineScheduleView {
    const nutritionPlans = [...daily.nutritionPlans]
        .sort((a, b) => MEAL_ORDER.indexOf(a.mealType) - MEAL_ORDER.indexOf(b.mealType))
        .map(toNutritionPlanItem);
    const exercisePlans = daily.exercisePlans.map(toExercisePlanItem);
    const mealInputs = daily.nutritionPlans.map((plan) => ({
        foods: plan.foodItems
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((item) => item.name),
        calories: plan.calories,
    }));

    const nutritionComplete = daily.nutritionPlans.every(isNutritionPlanCompleted);
    const exerciseComplete =
        daily.exercisePlans.length > 0 &&
        daily.exercisePlans.every(
            (plan) => toPlanProgress(plan.progressPercentage).isCompleted,
        );

    return {
        dayOfWeek: daily.dayOfWeek,
        dailyRoutineId: daily.id,
        nutritionPlans,
        exercisePlans,
        averageCalories: sumMealCalories(daily.nutritionPlans),
        nutritionSummary: toNutritionSummaryView(daily.nutritionSummary, daily.nutritionPlans),
        nutritionQualityScore: computeNutritionQualityScore(mealInputs),
        isCompleted:
            (daily.nutritionPlans.length === 0 || nutritionComplete) &&
            (daily.exercisePlans.length === 0 || exerciseComplete),
    };
}

function dedupeDailyRoutinesByDay(dailies: DailyRoutineRow[]): DailyRoutineRow[] {
    const byDay = new Map<DayOfWeekType, DailyRoutineRow>();

    for (const daily of dailies) {
        if (!byDay.has(daily.dayOfWeek)) {
            byDay.set(daily.dayOfWeek, daily);
        }
    }

    return DAY_ORDER.filter((day) => byDay.has(day)).map((day) => byDay.get(day)!);
}

export class RoutineMapper {
    static toScheduleView(routine: RoutineRow): RoutineScheduleView {
        const uniqueDailyRoutines = dedupeDailyRoutinesByDay(routine.dailyRoutines);

        return {
            summary: routine.summary || routine.report,
            reportReadme: routine.reportReadme,
            report: routine.summary || routine.report,
            difficulty: routine.difficulty,
            days: uniqueDailyRoutines.map(toDailySchedule),
        };
    }
}
