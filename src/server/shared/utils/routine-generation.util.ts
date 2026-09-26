import { DayOfWeekType, Difficulty, MealType } from "@/server/shared/types/enums";
import {
    ExerciseRoutineEntry,
    NutritionRoutineDay,
    NutritionSummary,
    RoutineDayPlan,
    RoutineFoodItemPlan,
    RoutineMealPlan,
    WeeklyRoutine,
    RoutineDayWithPlan,
    RoutinePayload,
} from "../../application/query/view/routine.view";
import { computeNutritionSummaryFromMeals } from "./nutrition-summary.util";
import { splitCaloriesAcrossFoods } from "./nutrition-food.util";

const DAY_ORDER: DayOfWeekType[] = [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
    "SUNDAY",
];

const DIFFICULTY_DAY_COUNT: Record<Difficulty, number> = {
    EASY: 2,
    MODERATE: 5,
    HARD: 7,
};

const MAX_REPORT_LEN = 120;
const MAX_SUMMARY_LEN = 200;
const MAX_REPORT_README_LEN = 3500;

export function truncateToMaxChars(text: string, maxChars: number): string {
    const trimmed = text.trim();
    if (trimmed.length <= maxChars) return trimmed;
    return trimmed.slice(0, maxChars);
}

/** @deprecated Use truncateToMaxChars */
export function truncateToMaxWords(text: string, maxWords: number): string {
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length <= maxWords) return text.trim();
    return words.slice(0, maxWords).join(" ");
}

const SOURCE_SUFFIX_PATTERN = /\s*[\(\（]\s*출처\s*:.*?[\)\）]\s*$/;
const SOURCE_INLINE_PATTERN = /\s*출처\s*:\s*[^\n]+/g;

export function stripSourceFromReport(text: string): string {
    return text.replace(SOURCE_SUFFIX_PATTERN, "").replace(SOURCE_INLINE_PATTERN, "").trim();
}

const REPORT_README_KEYS = [
    "reportReadme",
    "reportReadMe",
    "report_readme",
    "readme",
    "reportDetail",
    "reportDescription",
] as const;

export function pickReportReadme(parsed: Record<string, unknown>): string {
    for (const key of REPORT_README_KEYS) {
        const value = parsed[key];
        if (typeof value === "string" && value.trim()) {
            return value.trim();
        }
    }
    return "";
}

const DISEASE_LABELS: Record<string, string> = {
    OBESITY: "비만",
    HYPERTENSION: "고혈압",
    DIABETES: "당뇨",
    SMOKING: "흡연",
    ALCOHOL: "음주",
    STRESS: "스트레스",
};

export function buildRoutineRagSearchTerms(
    exposureRates: Record<string, number>,
): string[] {
    const terms = new Set<string>([
        "만성질환",
        "만성질병",
        "영양",
        "운동",
        "식이",
        "예방",
        "유산소",
        "식이섬유",
        "나트륨",
        "비타민",
        "단백질",
    ]);

    const diseaseTerms: Record<string, string[]> = {
        OBESITY: ["비만", "체중", "BMI", "칼로리"],
        HYPERTENSION: ["고혈압", "혈압", "나트륨", "저염"],
        DIABETES: ["당뇨", "당뇨병", "혈당", "식이섬유"],
        SMOKING: ["흡연", "금연"],
        ALCOHOL: ["음주", "절주", "알코올"],
        STRESS: ["스트레스", "정신건강", "수면"],
    };

    for (const [key, rate] of Object.entries(exposureRates)) {
        if (rate >= 15) {
            diseaseTerms[key]?.forEach((term) => terms.add(term));
        }
    }

    return [...terms].filter((term) => term.length >= 2).slice(0, 14);
}

function collectFoodsFromRoutine(routine: WeeklyRoutine): string[] {
    const foods = new Set<string>();
    for (const day of routine) {
        for (const nutritionDay of day.nutritionRoutine) {
            for (const meal of nutritionDay.meals) {
                meal.foods.forEach((food) => foods.add(food));
            }
        }
    }
    return [...foods];
}

function collectExercisesFromRoutine(routine: WeeklyRoutine): string[] {
    const tasks = new Set<string>();
    for (const day of routine) {
        for (const exercise of day.exerciseRoutine) {
            if (exercise.task.trim()) tasks.add(exercise.task.trim());
        }
    }
    return [...tasks];
}

export function buildFallbackReportReadme(
    exposureRates: Record<string, number>,
    difficulty: Difficulty,
    routine?: WeeklyRoutine,
): string {
    const difficultyLabel: Record<Difficulty, string> = {
        EASY: "주 2회",
        MODERATE: "주 5회",
        HARD: "매일",
    };

    const highRisk = Object.entries(exposureRates)
        .filter(([, rate]) => rate >= 25)
        .sort((a, b) => b[1] - a[1])
        .map(([key]) => DISEASE_LABELS[key] ?? key);

    const focus =
        highRisk.length > 0 ? highRisk.join("·") : "전반적 건강";

    const foods = routine ? collectFoodsFromRoutine(routine) : [];
    const exercises = routine ? collectExercisesFromRoutine(routine) : [];

    const foodLines =
        foods.length > 0
            ? foods
                  .slice(0, 8)
                  .map(
                      (food) =>
                          `- **${food}**: ${food}은(는) 균형 잡힌 영양소를 제공해 만성질환 예방에 도움이 되도록 루틴에 포함했어요.`,
                  )
                  .join("\n")
            : "균형 잡힌 식단으로 만성질환 위험을 관리해요.";

    const exerciseLines =
        exercises.length > 0
            ? exercises
                  .slice(0, 6)
                  .map(
                      (task) =>
                          `- **${task}**: ${task}을(를) ${difficultyLabel[difficulty]} 수행하도록 설계했으며, 규칙적인 활동으로 심혈관·대사 건강 개선과 만성질환 위험 감소에 도움이 돼요.`,
                  )
                  .join("\n")
            : `${difficultyLabel[difficulty]} 규칙적 활동으로 만성질환 위험을 낮춰요.`;

    const readme = [
        "## 왜 이 루틴인가요",
        `${difficultyLabel[difficulty]} 운동·영양 계획으로 ${focus} 위험을 낮추도록 맞춤 설계했어요.`,
        "",
        "## 음식별 영양소·만성질환 예방",
        foodLines,
        "",
        "## 운동 설계",
        exerciseLines,
        "",
        "## 참고 문헌",
        "- 질병관리청 국민건강영양조사",
    ].join("\n");

    return truncateToMaxChars(readme, MAX_REPORT_README_LEN);
}

const MEAL_TYPE_MAP: Record<string, MealType> = {
    BREAKFAST: "BREAKFAST",
    breakfast: "BREAKFAST",
    LUNCH: "LUNCH",
    lunch: "LUNCH",
    DINNER: "DINNER",
    dinner: "DINNER",
};

function asArray<T>(value: T | T[] | null | undefined): T[] {
    if (value == null) return [];
    return Array.isArray(value) ? value : [value];
}

function normalizeMealType(value: unknown): MealType {
    const key = String(value ?? "").trim();
    const mealType = MEAL_TYPE_MAP[key] ?? MEAL_TYPE_MAP[key.toUpperCase()];
    if (!mealType) {
        throw new Error(`Invalid routine generation payload: unknown mealType "${key}"`);
    }
    return mealType;
}

function parseFoodItems(rawFoods: unknown[], mealCaloriesHint: number): RoutineFoodItemPlan[] {
    const parsed = rawFoods
        .map((raw): RoutineFoodItemPlan | null => {
            if (typeof raw === "string") {
                const name = raw.trim();
                return name ? { name, calories: 0 } : null;
            }
            if (!raw || typeof raw !== "object") return null;

            const food = raw as Record<string, unknown>;
            const name = String(food.name ?? food.food ?? "").trim();
            if (!name) return null;

            return {
                name,
                calories: parseMacroValue(food.calories as string | number),
            };
        })
        .filter((item): item is RoutineFoodItemPlan => item !== null);

    if (parsed.length === 0) {
        throw new Error("Invalid routine generation payload: meal foods required");
    }

    const hasAllCalories = parsed.every((item) => item.calories > 0);
    if (hasAllCalories) {
        return parsed;
    }

    const total =
        mealCaloriesHint > 0
            ? mealCaloriesHint
            : parsed.reduce((sum, item) => sum + item.calories, 0);
    const split = splitCaloriesAcrossFoods(total > 0 ? total : 300, parsed.length);

    return parsed.map((item, index) => ({
        name: item.name,
        calories: item.calories > 0 ? item.calories : (split[index] ?? 0),
    }));
}

function normalizeMeal(raw: unknown): RoutineMealPlan {
    if (!raw || typeof raw !== "object") {
        throw new Error("Invalid routine generation payload: malformed meal");
    }

    const meal = raw as Record<string, unknown>;
    const mealCaloriesHint = parseMacroValue(meal.calories as string | number);
    const foodItems = parseFoodItems(asArray(meal.foods), mealCaloriesHint);
    const caloriesFromFoods = foodItems.reduce((sum, item) => sum + item.calories, 0);

    return {
        mealType: normalizeMealType(meal.mealType),
        foods: foodItems.map((item) => item.name),
        foodItems,
        calories: caloriesFromFoods > 0 ? caloriesFromFoods : mealCaloriesHint,
        isCompleted: false,
        progressionBar: 0,
    };
}

function normalizeNutritionRoutineDay(raw: unknown): NutritionRoutineDay {
    if (!raw || typeof raw !== "object") {
        throw new Error("Invalid routine generation payload: malformed nutrition routine");
    }

    const day = raw as Record<string, unknown>;
    const meals = asArray(day.meals).map(normalizeMeal);
    if (meals.length === 0) {
        throw new Error("Invalid routine generation payload: nutrition routine meals required");
    }

    const averageCalories = parseMacroValue(day.averageCalories as string | number);
    const mealCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);

    return {
        meals,
        averageCalories: averageCalories > 0 ? averageCalories : mealCalories,
        nutritionSummary: computeNutritionSummaryFromMeals(
            meals.map((meal) => ({
                foods: meal.foodItems.map((item) => item.name),
                calories: meal.calories,
            })),
        ),
    };
}

function normalizeExerciseEntry(raw: unknown): ExerciseRoutineEntry {
    if (!raw || typeof raw !== "object") {
        throw new Error("Invalid routine generation payload: malformed exercise entry");
    }

    const entry = raw as Record<string, unknown>;
    const task = String(entry.task ?? entry.name ?? "").trim();
    const frequency = String(entry.frequency ?? entry.freq ?? "1회").trim();

    if (!task) {
        throw new Error("Invalid routine generation payload: exercise task required");
    }

    return { task, frequency, isCompleted: false, progressionBar: 0 };
}

function normalizeDayPlan(raw: unknown): RoutineDayPlan {
    if (!raw || typeof raw !== "object") {
        throw new Error("Invalid routine generation payload: malformed day plan");
    }

    const plan = raw as Record<string, unknown>;

    let nutritionRoutine = plan.nutritionRoutine;
    if (nutritionRoutine == null && (plan.meals != null || plan.nutritionSummary != null)) {
        nutritionRoutine = {
            meals: plan.meals,
            averageCalories: plan.averageCalories,
            nutritionSummary: plan.nutritionSummary,
        };
    }

    const exerciseRoutine = asArray(plan.exerciseRoutine ?? plan.exercise ?? plan.exercises)
        .map(normalizeExerciseEntry);
    const normalizedNutritionRoutine = asArray(nutritionRoutine).map(normalizeNutritionRoutineDay);

    if (exerciseRoutine.length === 0 || normalizedNutritionRoutine.length === 0) {
        throw new Error("Invalid routine generation payload: malformed day plan");
    }

    return {
        exerciseRoutine,
        nutritionRoutine: normalizedNutritionRoutine,
        isCompleted: false,
    };
}

function normalizeRoutineArray(raw: unknown): WeeklyRoutine {
    return asArray(raw).map(normalizeDayPlan);
}

function normalizeDays(raw: unknown): DayOfWeekType[] {
    const days = asArray(raw).map((day) => String(day).trim().toUpperCase() as DayOfWeekType);
    if (days.length === 0) {
        throw new Error("Invalid routine generation payload: days required");
    }
    return days;
}

/** Keep the first plan for each weekday; return days in calendar order. */
export function dedupeDaysWithRoutine(
    days: DayOfWeekType[],
    routine: WeeklyRoutine,
): { days: DayOfWeekType[]; routine: WeeklyRoutine } {
    const routineByDay = new Map<DayOfWeekType, RoutineDayPlan>();

    for (let i = 0; i < days.length; i++) {
        if (!routineByDay.has(days[i])) {
            const plan = routine[i];
            if (!plan) {
                throw new Error("Invalid routine generation payload: missing routine for day");
            }
            routineByDay.set(days[i], plan);
        }
    }

    const dedupedDays = DAY_ORDER.filter((day) => routineByDay.has(day));

    return {
        days: dedupedDays,
        routine: dedupedDays.map((day) => routineByDay.get(day)!),
    };
}

export function expectedDayCount(difficulty: Difficulty): number {
    return DIFFICULTY_DAY_COUNT[difficulty];
}

/** Pair each `days[i]` with `routine[i]`. */
export function parseMacroValue(value: string | number): number {
    if (typeof value === "number") return value;
    const parsed = parseFloat(String(value).replace(/[^\d.-]/g, ""));
    return Number.isNaN(parsed) ? 0 : parsed;
}

export function toNutritionSummaryCreateInput(summary: NutritionSummary) {
    return {
        vitaminA: parseMacroValue(summary["vitamin A"]),
        vitaminC: parseMacroValue(summary["vitamin C"]),
        vitaminD: parseMacroValue(summary["vitamin D"]),
        calcium: parseMacroValue(summary.calcium),
        protein: parseMacroValue(summary.protein),
        carbohydrates: parseMacroValue(summary.carbohydrates),
        fat: parseMacroValue(summary.fat),
        fiber: parseMacroValue(summary.fiber),
        sugar: parseMacroValue(summary.sugar),
        sodium: parseMacroValue(summary.sodium),
        cholesterol: parseMacroValue(summary.cholesterol),
    };
}

export function zipRoutineDays(payload: RoutinePayload): RoutineDayWithPlan[] {
    const { days, routine } = payload;
    if (!Array.isArray(days) || !Array.isArray(routine)) {
        throw new Error("Invalid routine generation payload: days and routine must be arrays");
    }
    if (days.length !== routine.length) {
        throw new Error("Invalid routine generation payload: days and routine length mismatch");
    }
    return days.map((dayOfWeek, index) => ({
        dayOfWeek,
        dayPlan: routine[index],
    }));
}

export function iterateRoutineDays(
    days: DayOfWeekType[],
    routine: WeeklyRoutine,
): RoutineDayWithPlan[] {
    if (days.length !== routine.length) {
        throw new Error("days and routine length mismatch");
    }
    return days.map((dayOfWeek, index) => ({
        dayOfWeek,
        dayPlan: routine[index],
    }));
}

export function parseRoutineGenerationJson(raw: string): RoutinePayload {
    const jsonText = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(jsonText) as Record<string, unknown>;

    if (typeof parsed.report !== "string" && typeof parsed.summary !== "string") {
        throw new Error("Invalid routine generation payload");
    }

    const rawReport =
        typeof parsed.report === "string"
            ? parsed.report
            : typeof parsed.summary === "string"
              ? parsed.summary
              : "";

    const summarySource = stripSourceFromReport(rawReport);

    if (!summarySource.trim()) {
        throw new Error("Invalid routine generation payload: missing report");
    }

    const reportReadmeRaw = pickReportReadme(parsed);

    if (!parsed.difficulty) {
        throw new Error("Invalid routine generation payload: missing difficulty");
    }

    const difficulty = String(parsed.difficulty).toUpperCase() as Difficulty;
    const rawDays = normalizeDays(parsed.days);
    const rawRoutine = normalizeRoutineArray(parsed.routine);

    if (rawDays.length !== rawRoutine.length) {
        throw new Error("Invalid routine generation payload: days and routine length mismatch");
    }

    const { days, routine } = dedupeDaysWithRoutine(rawDays, rawRoutine);

    const expectedCount = expectedDayCount(difficulty);
    if (days.length !== expectedCount) {
        throw new Error(
            `Invalid routine generation payload: expected ${expectedCount} unique days for ${difficulty}, got ${days.length}`,
        );
    }

    return {
        summary: truncateToMaxChars(summarySource, MAX_SUMMARY_LEN),
        reportReadme: truncateToMaxChars(reportReadmeRaw, MAX_REPORT_README_LEN),
        report: truncateToMaxChars(summarySource, MAX_REPORT_LEN),
        routine,
        days,
        difficulty,
    };
}

/** @deprecated Use zipRoutineDays or iterateRoutineDays */
export function iterateWeeklyRoutineDays(payload: RoutinePayload): RoutineDayWithPlan[] {
    return zipRoutineDays(payload);
}

export type { RoutineDayPlan as GeneratedRoutineDayPlan };

export type RoutineDayChange = {
    dayOfWeek: DayOfWeekType;
    nutritionRoutine?: NutritionRoutineDay[];
    exerciseRoutine?: ExerciseRoutineEntry[];
};

export type RoutineAdjustmentPayload = {
    userMessage: string;
    summary: string | null;
    dayChanges: RoutineDayChange[];
};

function parseJsonText(raw: string): Record<string, unknown> {
    const jsonText = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(jsonText) as unknown;
    if (!parsed || typeof parsed !== "object") {
        throw new Error("Invalid routine adjustment payload");
    }
    return parsed as Record<string, unknown>;
}

function parseOptionalDayChange(raw: unknown): RoutineDayChange | null {
    if (!raw || typeof raw !== "object") return null;

    const item = raw as Record<string, unknown>;
    const dayKey = String(item.dayOfWeek ?? item.day ?? "").trim().toUpperCase();
    if (!DAY_ORDER.includes(dayKey as DayOfWeekType)) return null;

    const dayOfWeek = dayKey as DayOfWeekType;
    let nutritionRoutine: NutritionRoutineDay[] | undefined;
    let exerciseRoutine: ExerciseRoutineEntry[] | undefined;

    if (item.nutritionRoutine != null) {
        nutritionRoutine = asArray(item.nutritionRoutine).map(normalizeNutritionRoutineDay);
    }

    if (item.exerciseRoutine != null) {
        exerciseRoutine = asArray(item.exerciseRoutine).map(normalizeExerciseEntry);
    }

    if ((!nutritionRoutine || nutritionRoutine.length === 0) &&
        (!exerciseRoutine || exerciseRoutine.length === 0)) {
        return null;
    }

    return { dayOfWeek, nutritionRoutine, exerciseRoutine };
}

export function parseRoutineAdjustmentJson(raw: string): RoutineAdjustmentPayload {
    const parsed = parseJsonText(raw);

    const userMessage = String(
        parsed.userMessage ?? parsed.aiResponse ?? parsed.message ?? "",
    ).trim();

    if (!userMessage) {
        throw new Error("Invalid routine adjustment payload: userMessage required");
    }

    const summaryRaw = parsed.summary ?? parsed.report;
    const summary =
        typeof summaryRaw === "string" && summaryRaw.trim()
            ? truncateToMaxChars(stripSourceFromReport(summaryRaw.trim()), MAX_SUMMARY_LEN)
            : null;

    const dayChanges = asArray(parsed.dayChanges ?? parsed.changes)
        .map(parseOptionalDayChange)
        .filter((change): change is RoutineDayChange => change !== null);

    return { userMessage, summary, dayChanges };
}

const REQUIRED_MEAL_TYPES: MealType[] = ["BREAKFAST", "LUNCH", "DINNER"];

type MealPlanSource = {
    mealType: MealType;
    calories: number;
    foodItems: RoutineFoodItemPlan[];
    foods: string[];
};

export function mergeThreeMeals(
    existingPlans: MealPlanSource[],
    incomingMeals: RoutineMealPlan[],
): RoutineMealPlan[] {
    const incomingByType = new Map(incomingMeals.map((meal) => [meal.mealType, meal]));
    const existingByType = new Map(
        existingPlans.map((plan) => [
            plan.mealType,
            {
                mealType: plan.mealType,
                foods: plan.foods,
                foodItems: plan.foodItems,
                calories: plan.calories,
                isCompleted: false,
                progressionBar: 0,
            } satisfies RoutineMealPlan,
        ]),
    );

    return REQUIRED_MEAL_TYPES.map((mealType) => {
        const merged = incomingByType.get(mealType) ?? existingByType.get(mealType);
        if (!merged) {
            throw new Error(`Invalid routine adjustment: missing meal ${mealType}`);
        }
        return merged;
    });
}
