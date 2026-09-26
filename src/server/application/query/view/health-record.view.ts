import { DiseaseType, Gender } from "@/server/shared/types/enums";
import { HealthRankingSource } from "../../../shared/utils/health-ranking.util";

export type ExposureSeverity = "danger" | "warning" | "safe";

export interface ExposureRiskItemView {
    disease: DiseaseType;
    label: string;
    rate: number;
    displayRate: string;
    severity: ExposureSeverity;
    warn: boolean;
    barWidth: number;
}

/** Percentile vs same age group + gender cohort (higher overallScore = higher percentile). */
export interface HealthRankingView {
    percentile: number;
    rank: number;
    cohortSize: number;
    ageGroup: string;
    gender: Gender;
    source: HealthRankingSource;
}

export interface HealthRankingFormattedView {
    title: string;
    cohortLabel: string;
    percentileLabel: string;
    percentileDisplay: string;
    topPercent: number;
    topDisplay: string;
    rankDisplay: string;
    sourceNote: string;
}

/** Flat fields match frontend contract; `formatted` adds display metadata. */
export interface HealthRecordView {
    id: string;
    userId: string;
    bmi: number;
    overallScore: number;
    healthRanking: HealthRankingView;
    exposureRates: Record<string, number>;
    formatted: {
        overallScore: {
            value: number;
            max: number;
            display: string;
            label: string;
            progressPercent: number;
        };
        healthRanking: HealthRankingFormattedView;
        exposureRisks: {
            title: string;
            items: ExposureRiskItemView[];
            source: string;
        };
    };
}

export interface ProjectionItemView {
    difficulty: "EASY" | "MODERATE" | "HARD";
    label: string;
    schedule: string;
    rate: number;
    displayRate: string;
    reductionPercent: number;
}

/** Flat EASY/MODERATE/HARD + current for frontend; `formatted` adds labels. */
export interface HealthRecordProjectionView {
    current: number;
    EASY: number;
    MODERATE: number;
    HARD: number;
    formatted: {
        disease: DiseaseType;
        label: string;
        current: {
            rate: number;
            displayRate: string;
        };
        projections: ProjectionItemView[];
    };
}

export interface RoutineChatSummaryView {
    id: string;
}

export interface RoutineLogView {
    id: string;
    date: string;
    completed: boolean;
}

export interface RoutineSummarySourceView {
    label: string;
    page: string;
}

export interface RoutineSummarySectionView {
    headline: string;
    sections: Array<{ title: string; bullets: string[] }>;
    sources?: RoutineSummarySourceView[];
}

export interface RoutineTaskView {
    id: string;
    category: string;
    title: string;
    description: string | null;
    frequencyType: string;
    targetCountPerWeek: number;
    sortOrder: number;
    sourceRef: string | null;
    completedToday: boolean;
    completedThisWeek: number;
    targetThisWeek: number;
}

export interface RoutineProgressView {
    todayCompleted: number;
    todayTotal: number;
    todayPercent: number;
    weekCompleted: number;
    weekTarget: number;
    streakDays: number;
}

export interface RoutineView {
    id: string;
    difficulty: string;
    title: string;
    report?: string;
    nutritionPlan: string;
    workoutPlan: string;
    nutritionSummary?: RoutineSummarySectionView | null;
    workoutSummary?: RoutineSummarySectionView | null;
    weeklyRoutine?: import("./routine.view").WeeklyRoutine | null;
    tasks?: RoutineTaskView[];
    progress?: RoutineProgressView;
    isActive: boolean;
    chats: RoutineChatSummaryView[];
    logs?: RoutineLogView[];
}
