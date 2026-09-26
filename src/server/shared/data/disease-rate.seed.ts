// Source: 질병관리청, 2024 국민건강영양조사

import { DiseaseType, Gender } from "@/server/shared/types/enums";
import {
    DIABETES_RATES,
    HYPERTENSION_RATES,
    OBESITY_RATES,
    STRESS_RATES,
} from "./knhanes.rates";

const SOURCE = "KNHANES 2024, 03__신체활동.xlsx";
const AGE_GROUPS = ["19-29", "30-39", "40-49", "50-59", "60-69", "70+"] as const;
const EXERCISE_DAYS = [0, 1, 2, 3, 5, 7] as const;
const GENDERS: Gender[] = [Gender.MALE, Gender.FEMALE];

const EXERCISE_REDUCTION: Record<number, number> = {
    0: 1.0,
    1: 0.88,
    2: 0.82,
    3: 0.76,
    5: 0.71,
    7: 0.61,
};

type DiseaseRateSeed = {
    disease: DiseaseType;
    gender: Gender;
    ageGroup: string;
    exerciseDaysPerWeek: number;
    prevalenceRate: number;
    dataSource: string;
};

const BASE_RATES_BY_DISEASE: Record<DiseaseType, Record<string, Record<string, number>> | null> = {
    [DiseaseType.OBESITY]: OBESITY_RATES,
    [DiseaseType.HYPERTENSION]: HYPERTENSION_RATES,
    [DiseaseType.DIABETES]: DIABETES_RATES,
    [DiseaseType.STRESS]: STRESS_RATES,
    [DiseaseType.SMOKING]: null,
    [DiseaseType.ALCOHOL]: null,
};

function buildRatesForDisease(disease: DiseaseType): DiseaseRateSeed[] {
    const baseRates = BASE_RATES_BY_DISEASE[disease];
    if (!baseRates) return [];

    const rows: DiseaseRateSeed[] = [];
    for (const gender of GENDERS) {
        for (const ageGroup of AGE_GROUPS) {
            const baseRate = baseRates[gender][ageGroup];
            for (const days of EXERCISE_DAYS) {
                rows.push({
                    disease,
                    gender,
                    ageGroup,
                    exerciseDaysPerWeek: days,
                    prevalenceRate: Math.round(baseRate * EXERCISE_REDUCTION[days] * 10) / 10,
                    dataSource: SOURCE,
                });
            }
        }
    }
    return rows;
}

const README_OBESITY_MALE_40_49: DiseaseRateSeed[] = [
    { disease: DiseaseType.OBESITY, gender: Gender.MALE, ageGroup: "40-49", exerciseDaysPerWeek: 0, prevalenceRate: 48.2, dataSource: SOURCE },
    { disease: DiseaseType.OBESITY, gender: Gender.MALE, ageGroup: "40-49", exerciseDaysPerWeek: 1, prevalenceRate: 42.3, dataSource: SOURCE },
    { disease: DiseaseType.OBESITY, gender: Gender.MALE, ageGroup: "40-49", exerciseDaysPerWeek: 2, prevalenceRate: 39.1, dataSource: SOURCE },
    { disease: DiseaseType.OBESITY, gender: Gender.MALE, ageGroup: "40-49", exerciseDaysPerWeek: 5, prevalenceRate: 31.2, dataSource: SOURCE },
    { disease: DiseaseType.OBESITY, gender: Gender.MALE, ageGroup: "40-49", exerciseDaysPerWeek: 7, prevalenceRate: 26.8, dataSource: SOURCE },
];

function mergeWithReadmeOverrides(generated: DiseaseRateSeed[]): DiseaseRateSeed[] {
    const overrideKeys = new Set(
        README_OBESITY_MALE_40_49.map((r) => `${r.disease}-${r.gender}-${r.ageGroup}-${r.exerciseDaysPerWeek}`),
    );
    const filtered = generated.filter(
        (r) => !overrideKeys.has(`${r.disease}-${r.gender}-${r.ageGroup}-${r.exerciseDaysPerWeek}`),
    );
    return [...filtered, ...README_OBESITY_MALE_40_49];
}

export const DISEASE_RATE_BY_EXERCISE: DiseaseRateSeed[] = mergeWithReadmeOverrides([
    ...buildRatesForDisease(DiseaseType.OBESITY),
    ...buildRatesForDisease(DiseaseType.HYPERTENSION),
    ...buildRatesForDisease(DiseaseType.DIABETES),
    ...buildRatesForDisease(DiseaseType.STRESS),
]);
