import type { Gender } from "../types";

// 출처: 질병관리청, 2024 국민건강영양조사, 체질량지수 분포(표15-4)
export const BMI_AVERAGE_BY_GROUP: Record<Gender, Record<string, number>> = {
  MALE: {
    "19-29": 25.3,
    "30-39": 25.7,
    "40-49": 26.1,
    "50-59": 25.0,
    "60-69": 24.6,
    "70+": 23.7,
  },
  FEMALE: {
    "19-29": 22.2,
    "30-39": 23.0,
    "40-49": 23.4,
    "50-59": 23.5,
    "60-69": 24.0,
    "70+": 24.2,
  },
};

export function getAgeGroup(age: number): string {
  if (age < 30) return "19-29";
  if (age < 40) return "30-39";
  if (age < 50) return "40-49";
  if (age < 60) return "50-59";
  if (age < 70) return "60-69";
  return "70+";
}

export function calcBmi(weightKg: number, heightCm: number): number {
  return weightKg / (heightCm / 100) ** 2;
}

export function getBmiStatus(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: "저체중", color: "#8da0b3" };
  if (bmi < 23) return { label: "정상 체중", color: "#00c9a7" };
  if (bmi < 25) return { label: "과체중", color: "#f0a030" };
  if (bmi < 30) return { label: "비만", color: "#ff6b6b" };
  return { label: "고도비만", color: "#ff4444" };
}

export function estimateBmiPercentile(bmi: number, groupAvg: number): number {
  const diff = ((bmi - groupAvg) / groupAvg) * 100;
  return Math.round(Math.min(95, Math.max(5, 50 + diff * 2)));
}

export function formatAgeGroupLabel(ageGroup: string, gender: Gender): string {
  const genderLabel = gender === "MALE" ? "남성" : "여성";
  return `${ageGroup} ${genderLabel}`;
}
