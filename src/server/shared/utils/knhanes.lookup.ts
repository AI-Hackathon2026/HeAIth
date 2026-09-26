import { Gender } from "@/server/shared/types/enums";
import {
    DIABETES_RATES,
    HYPERTENSION_RATES,
    OBESITY_RATES,
    STRESS_RATES,
} from "../data/knhanes.rates";
import { getAgeGroup } from "./age-group.util";

export { getAgeGroup };

export function calcBmi(weightKg: number, heightCm: number): number {
    return weightKg / Math.pow(heightCm / 100, 2);
}

export function getExposureRates(
    gender: Gender,
    age: number,
    bmi: number,
    smokeFreq: number,
    alcoholFreq: number,
): Record<string, number> {
    const g = gender;
    const ag = getAgeGroup(age);

    return {
        OBESITY: bmi >= 25 ? OBESITY_RATES[g][ag] : OBESITY_RATES[g][ag] * 0.3,
        HYPERTENSION: HYPERTENSION_RATES[g][ag],
        DIABETES: DIABETES_RATES[g][ag],
        SMOKING: smokeFreq > 0 ? 100 : 0,
        ALCOHOL: alcoholFreq >= 3 ? 100 : alcoholFreq >= 1 ? 50 : 0,
        STRESS: STRESS_RATES[g][ag],
    };
}

export function calcOverallScore(exposureRates: Record<string, number>): number {
    const weights: Record<string, number> = {
        OBESITY: 0.25,
        HYPERTENSION: 0.25,
        DIABETES: 0.20,
        SMOKING: 0.15,
        ALCOHOL: 0.10,
        STRESS: 0.05,
    };
    const weighted = Object.entries(weights).reduce(
        (sum, [key, w]) => sum + (exposureRates[key] ?? 0) * w,
        0,
    );
    return Math.round(Math.max(0, 100 - weighted));
}

export const EXERCISE_DAY_BUCKETS = [0, 1, 2, 3, 5, 7] as const;

export function nearestExerciseBucket(exerciseFreq: number): number {
    return EXERCISE_DAY_BUCKETS.reduce((prev, curr) =>
        Math.abs(curr - exerciseFreq) < Math.abs(prev - exerciseFreq) ? curr : prev,
    );
}
