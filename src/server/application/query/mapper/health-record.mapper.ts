import { DiseaseType } from "@/server/shared/types/enums";
import { HealthRecordEntity } from "../../command/entity/health-record.entity";
import {
    ExposureRiskItemView,
    ExposureSeverity,
    HealthRecordProjectionView,
    HealthRecordView,
    ProjectionItemView,
} from "../view/health-record.view";
import {
    formatHealthRankingDisplay,
    HealthRankingResult,
} from "../../../shared/utils/health-ranking.util";

const KNHANES_SOURCE = "출처: 질병관리청 2024 국민건강영양조사";

const DISEASE_LABELS: Record<DiseaseType, string> = {
    [DiseaseType.SMOKING]: "흡연",
    [DiseaseType.ALCOHOL]: "음주",
    [DiseaseType.STRESS]: "스트레스",
    [DiseaseType.OBESITY]: "비만",
    [DiseaseType.HYPERTENSION]: "고혈압",
    [DiseaseType.DIABETES]: "당뇨병",
};

const DISPLAY_ORDER: DiseaseType[] = [
    DiseaseType.SMOKING,
    DiseaseType.ALCOHOL,
    DiseaseType.STRESS,
    DiseaseType.OBESITY,
    DiseaseType.HYPERTENSION,
    DiseaseType.DIABETES,
];

const DIFFICULTY_LABELS: Record<"EASY" | "MODERATE" | "HARD", { label: string; schedule: string }> = {
    EASY: { label: "쉬움", schedule: "주 2회" },
    MODERATE: { label: "보통", schedule: "주 5회" },
    HARD: { label: "어려움", schedule: "매일" },
};

const WARN_THRESHOLD = 25;

function formatRate(rate: number): string {
    return `${rate.toFixed(1)}%`;
}

function resolveSeverity(rate: number): ExposureSeverity {
    if (rate >= 50) return "danger";
    if (rate >= WARN_THRESHOLD) return "warning";
    return "safe";
}

function buildExposureItem(disease: DiseaseType, rate: number): ExposureRiskItemView {
    const severity = resolveSeverity(rate);
    return {
        disease,
        label: DISEASE_LABELS[disease],
        rate,
        displayRate: formatRate(rate),
        severity,
        warn: severity !== "safe",
        barWidth: Math.min(100, Math.round(rate * 10) / 10),
    };
}

export class HealthRecordMapper {
    static toView(record: HealthRecordEntity, ranking: HealthRankingResult): HealthRecordView {
        const items = DISPLAY_ORDER
            .map((disease) => buildExposureItem(disease, record.exposureRates[disease] ?? 0))
            .sort((a, b) => b.rate - a.rate);

        const score = record.overallScore;

        const exposureRates = { ...record.exposureRates };

        return {
            id: record.id!,
            userId: record.userId,
            bmi: record.bmi,
            overallScore: score,
            healthRanking: ranking,
            exposureRates,
            formatted: {
                overallScore: {
                    value: score,
                    max: 100,
                    display: `${score} / 100`,
                    label: "종합 건강 점수",
                    progressPercent: score,
                },
                healthRanking: formatHealthRankingDisplay(ranking),
                exposureRisks: {
                    title: "질환 노출 위험도 (동연령 대비)",
                    items,
                    source: KNHANES_SOURCE,
                },
            },
        };
    }

    static toProjectionView(
        disease: DiseaseType,
        data: { current: number; EASY: number; MODERATE: number; HARD: number },
    ): HealthRecordProjectionView {
        const current = data.current;

        const buildProjection = (
            difficulty: "EASY" | "MODERATE" | "HARD",
            rate: number,
        ): ProjectionItemView => {
            const meta = DIFFICULTY_LABELS[difficulty];
            const reduction = current > 0 ? Math.round(((current - rate) / current) * 1000) / 10 : 0;

            return {
                difficulty,
                label: meta.label,
                schedule: meta.schedule,
                rate,
                displayRate: formatRate(rate),
                reductionPercent: Math.max(0, reduction),
            };
        };

        return {
            current,
            EASY: data.EASY,
            MODERATE: data.MODERATE,
            HARD: data.HARD,
            formatted: {
                disease,
                label: DISEASE_LABELS[disease],
                current: {
                    rate: current,
                    displayRate: formatRate(current),
                },
                projections: [
                    buildProjection("EASY", data.EASY),
                    buildProjection("MODERATE", data.MODERATE),
                    buildProjection("HARD", data.HARD),
                ],
            },
        };
    }
}
