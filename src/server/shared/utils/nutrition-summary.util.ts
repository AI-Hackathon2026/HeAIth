import { NutritionSummary } from "../../application/query/view/routine.view";

type MealInput = {
    foods: string[];
    calories?: number;
};

const PROTEIN_KEYWORDS =
    /단백|닭|계란|고기|살|두부|콩|두유|생선|연어|참치|우유|치즈|요거트|굴|새우|protein|chicken|egg|tofu|fish|meat|milk|yogurt/i;
const CARB_KEYWORDS =
    /밥|면|빵|현미|잡곡|곡|과일|감자|고구마|오트|시리얼|rice|bread|fruit|oat|pasta|noodle/i;
const FAT_KEYWORDS =
    /기름|지방|견과|아몬드|호두|아보카도|버터|참기름|들기름|nut|oil|avocado|seed/i;

const VITAMIN_A_KEYWORDS = /당근|시금치|고구마|호박|브로콜리|carrot|spinach|pumpkin|broccoli/i;
const VITAMIN_C_KEYWORDS = /과일|오렌지|귤|키위|딸기|파프리카|브로콜리|orange|kiwi|strawberry|pepper/i;
const VITAMIN_D_KEYWORDS = /연어|고등어|계란|우유|버섯|salmon|mackerel|egg|mushroom|milk/i;
const CALCIUM_KEYWORDS = /우유|치즈|요거트|두부|멸치|김|시금치|milk|cheese|yogurt|tofu|anchovy|seaweed/i;
const FIBER_KEYWORDS = /현미|잡곡|채소|나물|샐러드|과일|콩|견과|whole|vegetable|salad|bean|fiber/i;
const SUGAR_KEYWORDS = /디저트|케이크|사탕|음료|과일|주스|초콜|dessert|cake|candy|juice|chocolate/i;
const SODIUM_KEYWORDS = /김치|젓갈|라면|햄|소시지|찌개|국|pickle|ramen|ham|sausage|soup/i;
const CHOLESTEROL_KEYWORDS = /계란|삼겹|베이컨|버터|치즈|egg|bacon|butter|pork|cheese/i;

/** Share of the 100% nutrition pie allocated to each group. */
const MACRO_BUDGET = 55;
const VITAMIN_MINERAL_BUDGET = 25;
const OTHER_BUDGET = 20;

const SUMMARY_KEYS = [
    "vitamin A",
    "vitamin C",
    "vitamin D",
    "calcium",
    "protein",
    "carbohydrates",
    "fat",
    "fiber",
    "sugar",
    "sodium",
    "cholesterol",
] as const;

function clampPercent(value: number): number {
    if (Number.isNaN(value)) return 0;
    return Math.min(100, Math.max(0, Math.round(value)));
}

function countKeywordMatches(text: string, pattern: RegExp): number {
    return (
        text.split(/[,，、\s]+/).filter((token) => pattern.test(token)).length +
        (pattern.test(text) ? 1 : 0)
    );
}

function allocateBudget(weights: number[], budget: number): number[] {
    if (weights.length === 0) return [];

    const total = weights.reduce((sum, weight) => sum + weight, 0);
    if (total <= 0) {
        const even = Math.floor(budget / weights.length);
        const values = weights.map(() => even);
        values[0] += budget - even * weights.length;
        return values;
    }

    const scaled = weights.map((weight) => Math.round((weight / total) * budget));
    const diff = budget - scaled.reduce((sum, value) => sum + value, 0);
    scaled[0] += diff;
    return scaled;
}

function computeMacroSplit(meals: MealInput[]): { protein: number; carbohydrates: number; fat: number } {
    let proteinWeight = 25;
    let carbWeight = 45;
    let fatWeight = 30;

    for (const meal of meals) {
        const text = meal.foods.join(" ");
        const mealCalories = meal.calories && meal.calories > 0 ? meal.calories : 1;
        const calorieFactor = Math.min(2, mealCalories / 500);

        proteinWeight += countKeywordMatches(text, PROTEIN_KEYWORDS) * 8 * calorieFactor;
        carbWeight += countKeywordMatches(text, CARB_KEYWORDS) * 8 * calorieFactor;
        fatWeight += countKeywordMatches(text, FAT_KEYWORDS) * 6 * calorieFactor;
    }

    return { protein: proteinWeight, carbohydrates: carbWeight, fat: fatWeight };
}

function scoreFromFoods(
    meals: MealInput[],
    pattern: RegExp,
    base: number,
    boostPerHit: number,
): number {
    const text = meals.flatMap((meal) => meal.foods).join(" ");
    const hits = countKeywordMatches(text, pattern);
    return clampPercent(base + hits * boostPerHit);
}

function scoreLimitNutrient(
    meals: MealInput[],
    pattern: RegExp,
    base: number,
    penaltyPerHit: number,
): number {
    const text = meals.flatMap((meal) => meal.foods).join(" ");
    const hits = countKeywordMatches(text, pattern);
    return clampPercent(base - hits * penaltyPerHit);
}

function formatPercent(value: number): string {
    return `${clampPercent(value)}%`;
}

function parsePercent(value: string): number {
    const parsed = parseFloat(String(value).replace(/[^\d.-]/g, ""));
    return Number.isNaN(parsed) ? 0 : parsed;
}

function toPercentRecord(values: Record<(typeof SUMMARY_KEYS)[number], number>): NutritionSummary {
    return {
        "vitamin A": formatPercent(values["vitamin A"]),
        "vitamin C": formatPercent(values["vitamin C"]),
        "vitamin D": formatPercent(values["vitamin D"]),
        calcium: formatPercent(values.calcium),
        protein: formatPercent(values.protein),
        carbohydrates: formatPercent(values.carbohydrates),
        fat: formatPercent(values.fat),
        fiber: formatPercent(values.fiber),
        sugar: formatPercent(values.sugar),
        sodium: formatPercent(values.sodium),
        cholesterol: formatPercent(values.cholesterol),
    };
}

/**
 * Build a compositional nutrition profile where all displayed percentages sum to 100.
 * - protein + carbohydrates + fat share 55% of the pie (calorie-macro mix)
 * - vitamins/minerals share 25%
 * - fiber/sugar/sodium/cholesterol share 20%
 */
export function computeNutritionSummaryFromMeals(meals: MealInput[]): NutritionSummary {
    const safeMeals = meals.filter((meal) => meal.foods.length > 0);
    const macros = computeMacroSplit(safeMeals);

    const [proteinShare, carbShare, fatShare] = allocateBudget(
        [macros.protein, macros.carbohydrates, macros.fat],
        MACRO_BUDGET,
    );

    const [vitaminAShare, vitaminCShare, vitaminDShare, calciumShare] = allocateBudget(
        [
            scoreFromFoods(safeMeals, VITAMIN_A_KEYWORDS, 45, 12),
            scoreFromFoods(safeMeals, VITAMIN_C_KEYWORDS, 50, 10),
            scoreFromFoods(safeMeals, VITAMIN_D_KEYWORDS, 40, 12),
            scoreFromFoods(safeMeals, CALCIUM_KEYWORDS, 45, 12),
        ],
        VITAMIN_MINERAL_BUDGET,
    );

    const [fiberShare, sugarShare, sodiumShare, cholesterolShare] = allocateBudget(
        [
            scoreFromFoods(safeMeals, FIBER_KEYWORDS, 50, 10),
            scoreLimitNutrient(safeMeals, SUGAR_KEYWORDS, 85, 12),
            scoreLimitNutrient(safeMeals, SODIUM_KEYWORDS, 80, 10),
            scoreLimitNutrient(safeMeals, CHOLESTEROL_KEYWORDS, 82, 10),
        ],
        OTHER_BUDGET,
    );

    return toPercentRecord({
        "vitamin A": vitaminAShare,
        "vitamin C": vitaminCShare,
        "vitamin D": vitaminDShare,
        calcium: calciumShare,
        protein: proteinShare,
        carbohydrates: carbShare,
        fat: fatShare,
        fiber: fiberShare,
        sugar: sugarShare,
        sodium: sodiumShare,
        cholesterol: cholesterolShare,
    });
}

/** 0–100 overall nutrition quality score for UI badges (not a compositional share). */
export function computeNutritionQualityScore(meals: MealInput[]): number {
    const safeMeals = meals.filter((meal) => meal.foods.length > 0);
    if (safeMeals.length === 0) return 0;

    const macros = computeMacroSplit(safeMeals);
    const macroTotal = macros.protein + macros.carbohydrates + macros.fat;
    const proteinRatio = macroTotal > 0 ? (macros.protein / macroTotal) * 100 : 0;
    const carbRatio = macroTotal > 0 ? (macros.carbohydrates / macroTotal) * 100 : 0;
    const fatRatio = macroTotal > 0 ? (macros.fat / macroTotal) * 100 : 0;

    const balancePenalty =
        Math.abs(proteinRatio - 30) * 0.4 +
        Math.abs(carbRatio - 45) * 0.3 +
        Math.abs(fatRatio - 25) * 0.3;

    const microScores = [
        scoreFromFoods(safeMeals, VITAMIN_A_KEYWORDS, 45, 12),
        scoreFromFoods(safeMeals, VITAMIN_C_KEYWORDS, 50, 10),
        scoreFromFoods(safeMeals, VITAMIN_D_KEYWORDS, 40, 12),
        scoreFromFoods(safeMeals, CALCIUM_KEYWORDS, 45, 12),
        scoreFromFoods(safeMeals, FIBER_KEYWORDS, 50, 10),
        scoreLimitNutrient(safeMeals, SUGAR_KEYWORDS, 85, 12),
        scoreLimitNutrient(safeMeals, SODIUM_KEYWORDS, 80, 10),
        scoreLimitNutrient(safeMeals, CHOLESTEROL_KEYWORDS, 82, 10),
    ];
    const microAverage =
        microScores.reduce((sum, score) => sum + score, 0) / microScores.length;

    return clampPercent(microAverage - balancePenalty * 0.35);
}

export function rebalanceNutritionSummary(summary: NutritionSummary): NutritionSummary {
    const raw = SUMMARY_KEYS.reduce(
        (acc, key) => {
            acc[key] = parsePercent(summary[key]);
            return acc;
        },
        {} as Record<(typeof SUMMARY_KEYS)[number], number>,
    );

    const total = SUMMARY_KEYS.reduce((sum, key) => sum + raw[key], 0);
    if (total <= 0) return summary;

    const normalized = SUMMARY_KEYS.map((key) => ({
        key,
        value: Math.round((raw[key] / total) * 100),
    }));
    const diff = 100 - normalized.reduce((sum, entry) => sum + entry.value, 0);
    normalized[0].value += diff;

    return toPercentRecord(
        normalized.reduce(
            (acc, entry) => {
                acc[entry.key] = entry.value;
                return acc;
            },
            {} as Record<(typeof SUMMARY_KEYS)[number], number>,
        ),
    );
}

export function sumNutritionSummaryPercents(summary: NutritionSummary): number {
    return SUMMARY_KEYS.reduce((sum, key) => sum + parsePercent(summary[key]), 0);
}
