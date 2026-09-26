import {
    CharacterStage,
    DayOfWeekType,
    Difficulty,
    Gender,
    HeroStyle,
    MealType,
    NutritionSummary,
    PlanType,
    Role,
} from "@/server/shared/types/enums";

// Every row stores timestamps as ISO-8601 strings so the whole database
// round-trips through JSON without custom revivers.
type Timestamps = { createdAt: string; updatedAt: string };

export type UserRow = Timestamps & {
    id: string;
    username: string;
    email: string;
    password: string;
    role: Role;
    refreshToken: string | null;
};

export type HealthStatusRow = Timestamps & {
    id: string;
    userId: string;
    gender: Gender;
    age: number;
    height: number;
    weight: number;
    alcoholFreq: number;
    smokeFreq: number;
    exerciseFreq: number;
};

export type HealthRecordRow = Timestamps & {
    id: string;
    userId: string;
    bmi: number;
    exposureRates: Record<string, number>;
    overallScore: number;
};

export type RoutineRow = Timestamps & {
    id: string;
    userId: string;
    difficulty: Difficulty;
    report: string;
    summary: string;
    reportReadme: string;
    isActive: boolean;
};

export type DailyRoutineRow = Timestamps & {
    id: string;
    routineId: string;
    dayOfWeek: DayOfWeekType;
    nutritionSummaryId: string | null;
};

export type NutritionSummaryRow = NutritionSummary;

export type NutritionPlanRow = Timestamps & {
    id: string;
    dailyRoutineId: string;
    mealType: MealType;
    calories: number;
    progressPercentage: number;
};

export type NutritionFoodItemRow = Timestamps & {
    id: string;
    nutritionPlanId: string;
    name: string;
    calories: number;
    sortOrder: number;
    progressPercentage: number;
};

export type ExercisePlanRow = Timestamps & {
    id: string;
    dailyRoutineId: string;
    exercises: unknown;
    progressPercentage: number;
};

export type ChatRow = Timestamps & {
    id: string;
    userId: string;
    title: string;
    routineId: string | null;
};

export type MessageRow = Timestamps & {
    id: string;
    chatId: string;
    role: Role;
    text: string;
};

/** A PDF uploaded at runtime. Page text lives in a sidecar file, not in the db. */
export type UploadedFileRow = Timestamps & {
    id: string;
    filename: string;
};

export type RagStoreRow = {
    id: string;
    storeName: string;
    displayName: string;
    createdAt: string;
};

export type CharacterProgressRow = Timestamps & {
    id: string;
    userId: string;
    level: number;
    xp: number;
    stage: CharacterStage;
    heroStyle: HeroStyle;
    totalCompletions: number;
};

export type PlanProgressEventRow = {
    id: string;
    userId: string;
    routineId: string;
    planType: PlanType;
    planId: string;
    progressPercentage: number;
    xpGranted: number;
    createdAt: string;
};

export type DbSchema = {
    version: 1;
    users: UserRow[];
    healthStatuses: HealthStatusRow[];
    healthRecords: HealthRecordRow[];
    routines: RoutineRow[];
    dailyRoutines: DailyRoutineRow[];
    nutritionSummaries: NutritionSummaryRow[];
    nutritionPlans: NutritionPlanRow[];
    nutritionFoodItems: NutritionFoodItemRow[];
    exercisePlans: ExercisePlanRow[];
    chats: ChatRow[];
    messages: MessageRow[];
    uploadedFiles: UploadedFileRow[];
    /** Ids of bundled documents an admin has removed from the library. */
    hiddenDocumentIds: string[];
    ragStores: RagStoreRow[];
    characterProgress: CharacterProgressRow[];
    planProgressEvents: PlanProgressEventRow[];
    settings: { geminiModel?: string };
};

export const createEmptyDb = (): DbSchema => ({
    version: 1,
    users: [],
    healthStatuses: [],
    healthRecords: [],
    routines: [],
    dailyRoutines: [],
    nutritionSummaries: [],
    nutritionPlans: [],
    nutritionFoodItems: [],
    exercisePlans: [],
    chats: [],
    messages: [],
    uploadedFiles: [],
    hiddenDocumentIds: [],
    ragStores: [],
    characterProgress: [],
    planProgressEvents: [],
    settings: {},
});
