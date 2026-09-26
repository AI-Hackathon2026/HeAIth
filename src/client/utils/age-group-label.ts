import type { Gender } from "../types";

export function formatAgeGroupShort(ageGroup: string): string {
  switch (ageGroup) {
    case "19-29":
      return "20대";
    case "30-39":
      return "30대";
    case "40-49":
      return "40대";
    case "50-59":
      return "50대";
    case "60-69":
      return "60대";
    case "70+":
      return "70대+";
    default:
      return ageGroup;
  }
}

export function formatCohortLabel(ageGroup: string, gender: Gender): string {
  const genderLabel = gender === "MALE" ? "남성" : "여성";
  return `${formatAgeGroupShort(ageGroup)} ${genderLabel}`;
}
