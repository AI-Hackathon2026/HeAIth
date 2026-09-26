import type { MealType, RoutineDifficulty, RoutineProjection } from "../types";

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  BREAKFAST: "아침",
  LUNCH: "점심",
  DINNER: "저녁",
  SNACK: "간식",
};

export const DAY_OF_WEEK_ORDER = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

export const DAY_OF_WEEK_LABELS: Record<string, string> = {
  MONDAY: "월요일",
  TUESDAY: "화요일",
  WEDNESDAY: "수요일",
  THURSDAY: "목요일",
  FRIDAY: "금요일",
  SATURDAY: "토요일",
  SUNDAY: "일요일",
};

export const MEAL_TYPE_ORDER: MealType[] = [
  "BREAKFAST",
  "LUNCH",
  "DINNER",
  "SNACK",
];

export const MEAL_TYPE_ICONS: Record<MealType, string> = {
  BREAKFAST: "🌅",
  LUNCH: "🌞",
  DINNER: "🌙",
  SNACK: "🍎",
};

export const ROUTINE_DAYS_PER_PAGE = 4;

export function formatRoutineDayLabel(dayNumber: number, _dayOfWeek?: string): string {
  return `${dayNumber}일차`;
}

export type DiseaseKey =
  | "OBESITY"
  | "HYPERTENSION"
  | "DIABETES"
  | "SMOKING"
  | "ALCOHOL"
  | "STRESS";

export const DIFFICULTY_LABELS = {
  EASY: "입문",
  MODERATE: "표준",
  HARD: "고강도",
} as const;

export const DIFFICULTY_FREQUENCY = {
  EASY: "주 2회",
  MODERATE: "주 5회",
  HARD: "매일",
} as const;

export const DISEASE_LABELS: Record<DiseaseKey, string> = {
  OBESITY: "비만",
  HYPERTENSION: "고혈압",
  DIABETES: "당뇨병",
  SMOKING: "흡연",
  ALCOHOL: "음주",
  STRESS: "스트레스",
};

export const DISEASE_ORDER: DiseaseKey[] = [
  "OBESITY",
  "STRESS",
  "HYPERTENSION",
  "ALCOHOL",
  "DIABETES",
  "SMOKING",
];

/** 만성 질환 — 난이도별 예측에 사용 (생활습관 단독 항목 제외) */
export const CHRONIC_DISEASE_KEYS: DiseaseKey[] = [
  "OBESITY",
  "HYPERTENSION",
  "DIABETES",
  "STRESS",
];

export const DIFFICULTY_ROUTINE_OUTLINE: Record<
  RoutineDifficulty,
  { nutrition: string; workout: string; focus: string }
> = {
  EASY: {
    focus: "가벼운 시작 · 지속 가능한 습관",
    nutrition: "하루 1끼 균형 식단, 가공식품·당류 주 2회 이하",
    workout: "가벼운 유산소 20분 + 스트레칭 (주 2회)",
  },
  MODERATE: {
    focus: "균형 잡힌 개선 · 생활 리듬 정착",
    nutrition: "매끼 채소 1/2, 나트륨·당류 관리, 수분 2L",
    workout: "유산소 30분 + 근력 15분 (주 5회)",
  },
  HARD: {
    focus: "적극적 관리 · 목표 달성 집중",
    nutrition: "맞춤 영양 계획 전면 적용, 외식·야식 최소화",
    workout: "유산소 40분 + 근력 25분 + 코어 (매일)",
  },
};

export function formatRiskReduction(current: number, projected: number): string {
  const delta = current - projected;
  if (delta <= 0.05) return "유지";
  return `▼ ${delta.toFixed(1)}%p`;
}

export function getProjectedRates(
  projection: RoutineProjection | null,
  disease: DiseaseKey,
  difficulty: RoutineDifficulty,
  currentRates: Record<string, number>,
): { current: number; projected: number } {
  const current = projection?.current ?? currentRates[disease] ?? 0;
  const projected = projection?.[difficulty] ?? current;
  return { current, projected };
}

export function getAverageRiskReduction(
  difficulty: RoutineDifficulty,
  projections: Record<DiseaseKey, RoutineProjection | null>,
  currentRates: Record<string, number>,
): number {
  let total = 0;
  for (const disease of CHRONIC_DISEASE_KEYS) {
    const { current, projected } = getProjectedRates(
      projections[disease],
      disease,
      difficulty,
      currentRates,
    );
    total += Math.max(0, current - projected);
  }
  return total / CHRONIC_DISEASE_KEYS.length;
}

export function formatAverageReduction(avgReduction: number): string {
  if (avgReduction <= 0.05) return "유지";
  return `▼ ${avgReduction.toFixed(1)}%p`;
}

/** 카드용 — 쉬운 한국어 요약 */
export function formatAverageReductionSummary(avgReduction: number): {
  title: string;
  message: string;
  muted: boolean;
} {
  if (avgReduction <= 0.05) {
    return {
      title: "4개월 후 예상",
      message: "지금과 비슷해요",
      muted: true,
    };
  }
  return {
    title: "4개월 꾸준히 하면",
    message: `평균 만성 질환 위험률 ${avgReduction.toFixed(1)}% 감소`,
    muted: false,
  };
}

/** 상세 모달 하단 — 평균 변화 */
export function formatModalAverageReductionSummary(avgReduction: number): {
  title: string;
  message: string;
  muted: boolean;
} {
  if (avgReduction <= 0.05) {
    return {
      title: "평균 만성 질환 위험률 변화",
      message: "지금과 비슷해요",
      muted: true,
    };
  }
  return {
    title: "평균 만성 질환 위험률 변화",
    message: `약 ${avgReduction.toFixed(1)}% 감소 예상`,
    muted: false,
  };
}

/** 상세 모달 — 질환별 변화 문구 */
export function formatDiseaseChangeSummary(
  current: number,
  projected: number,
): string {
  const delta = current - projected;
  if (delta <= 0.05) {
    return `지금 ${current.toFixed(1)}% · 큰 변화 없음`;
  }
  return `지금 ${current.toFixed(1)}% → ${projected.toFixed(1)}% (${delta.toFixed(1)}% 감소)`;
}

export function getRiskColor(rate: number): string {
  if (rate >= 40) return "#E05C5C";
  if (rate >= 20) return "#E8883A";
  return "#2E9E6B";
}

export function getHighestRiskDisease(
  rates: Record<string, number>,
): DiseaseKey {
  let maxKey: DiseaseKey = "OBESITY";
  let maxVal = -1;
  for (const key of DISEASE_ORDER) {
    const val = rates[key] ?? 0;
    if (val > maxVal) {
      maxVal = val;
      maxKey = key;
    }
  }
  return maxKey;
}

export const STARTER_PROMPTS = [
  "오늘 운동 강도를 높여줘",
  "식단을 전부 일식으로 바꿔줘",
  "지금 운동 루틴과 식단에 대해 자세히 알려줘",
];
