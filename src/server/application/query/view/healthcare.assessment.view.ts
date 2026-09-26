export type ObesityStatus = "obese" | "underweight" | "normal";
export type ConditionStatus = "positive" | "normal" | "unknown";

export interface ConditionAssessment {
    status: ConditionStatus;
    label: string;
    criteria: string;
    vulnerabilityGuide: string | null;
    lifestyleGuide: string | null;
}

export interface ObesityAssessment {
    status: ObesityStatus;
    label: string;
    criteria: string;
    vulnerabilityGuide: string | null;
    lifestyleGuide: string | null;
}

export interface LifestyleAssessment {
    alcoholFreq: number;
    smokeFreq: number;
    exerciseFreq: number;
    alcoholGuide: string | null;
    smokingGuide: string | null;
    exerciseGuide: string | null;
}

export interface HealthcareAssessmentView {
    id: string;
    userId: string;
    gender: string;
    age: number;
    height: number;
    weight: number;
    bmi: number;
    obesity: ObesityAssessment;
    lifestyle: LifestyleAssessment;
}
