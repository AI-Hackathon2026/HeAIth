import { Gender } from "@/server/shared/types/enums";

export type HealthRankingSource = "peers" | "estimated";

export interface HealthRankingResult {
    /** 0–100: share of the cohort with a lower overall score (higher = healthier). */
    percentile: number;
    /** 1 = best score in the cohort. */
    rank: number;
    cohortSize: number;
    ageGroup: string;
    gender: Gender;
    source: HealthRankingSource;
}

export function getAgeRange(ageGroup: string): { min: number; max: number } {
    switch (ageGroup) {
        case "19-29":
            return { min: 0, max: 29 };
        case "30-39":
            return { min: 30, max: 39 };
        case "40-49":
            return { min: 40, max: 49 };
        case "50-59":
            return { min: 50, max: 59 };
        case "60-69":
            return { min: 60, max: 69 };
        case "70+":
            return { min: 70, max: 150 };
        default:
            return { min: 0, max: 150 };
    }
}

export function buildHealthRanking(
    overallScore: number,
    peerScores: number[],
    ageGroup: string,
    gender: Gender,
): HealthRankingResult {
    const cohortSize = peerScores.length;

    if (cohortSize <= 1) {
        return {
            percentile: overallScore,
            rank: 1,
            cohortSize: Math.max(cohortSize, 1),
            ageGroup,
            gender,
            source: "estimated",
        };
    }

    const rank = 1 + peerScores.filter((score) => score > overallScore).length;
    const betterThanCount = peerScores.filter((score) => score < overallScore).length;
    const percentile = Math.round((betterThanCount / cohortSize) * 100);

    return {
        percentile,
        rank,
        cohortSize,
        ageGroup,
        gender,
        source: "peers",
    };
}

export function toTopPercent(percentile: number): number {
    return Math.max(0, Math.min(100, 100 - percentile));
}

const GENDER_LABELS: Record<Gender, string> = {
    MALE: "남성",
    FEMALE: "여성",
};

const AGE_GROUP_LABELS: Record<string, string> = {
    "19-29": "20대",
    "30-39": "30대",
    "40-49": "40대",
    "50-59": "50대",
    "60-69": "60대",
    "70+": "70대 이상",
};

export function formatCohortLabel(ageGroup: string, gender: Gender): string {
    const ageLabel = AGE_GROUP_LABELS[ageGroup] ?? ageGroup;
    return `${ageLabel} ${GENDER_LABELS[gender]}`;
}

export function formatHealthRankingDisplay(ranking: HealthRankingResult) {
    const topPercent = toTopPercent(ranking.percentile);

    return {
        title: "동연령·동성별 건강 순위",
        cohortLabel: formatCohortLabel(ranking.ageGroup, ranking.gender),
        percentileLabel: "동연령·동성별보다 건강한 사람",
        percentileDisplay: `${ranking.percentile}%`,
        topPercent,
        topDisplay: `상위 ${topPercent}%`,
        rankDisplay: `${ranking.rank}위 / ${ranking.cohortSize}명`,
        sourceNote:
            ranking.source === "peers"
                ? "같은 연령·성별 사용자 데이터 기준"
                : "비교 대상이 부족해 점수 기반 추정치입니다",
    };
}
