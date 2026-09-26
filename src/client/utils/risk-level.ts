import type { RiskLevel } from "../constants/risk-colors";
import type { DiseaseKey } from "../constants/routine";
import type { HealthStatus } from "../types";

type HealthStatusFreq = Pick<HealthStatus, "smokeFreq" | "alcoholFreq">;

export const DASHBOARD_DISEASE_ORDER: DiseaseKey[] = [
  "ALCOHOL",
  "SMOKING",
  "OBESITY",
  "STRESS",
  "HYPERTENSION",
  "DIABETES",
];

export function getRiskLevel(
  disease: string,
  rate: number,
  healthStatus?: HealthStatusFreq,
): RiskLevel {
  if (disease === "SMOKING") {
    if (!healthStatus || healthStatus.smokeFreq === 0) return "GOOD";
    if (healthStatus.smokeFreq >= 3) return "CRITICAL";
    return "WARNING";
  }

  if (disease === "ALCOHOL") {
    if (!healthStatus || healthStatus.alcoholFreq === 0) return "GOOD";
    if (healthStatus.alcoholFreq >= 5) return "CRITICAL";
    if (healthStatus.alcoholFreq >= 3) return "WARNING";
    return "CAUTION";
  }

  if (disease === "OBESITY") {
    if (rate >= 35) return "CRITICAL";
    if (rate >= 25) return "WARNING";
    if (rate >= 15) return "CAUTION";
    return "GOOD";
  }

  if (disease === "STRESS") {
    if (rate >= 40) return "CRITICAL";
    if (rate >= 30) return "CAUTION";
    return "GOOD";
  }

  if (rate >= 25) return "CRITICAL";
  if (rate >= 15) return "WARNING";
  if (rate >= 8) return "CAUTION";
  return "GOOD";
}

export function getRiskBarWidth(
  disease: string,
  rate: number,
  healthStatus?: HealthStatusFreq,
): number {
  if (disease === "SMOKING") {
    return healthStatus?.smokeFreq
      ? Math.min(100, (healthStatus.smokeFreq / 7) * 100)
      : 0;
  }

  if (disease === "ALCOHOL") {
    return healthStatus?.alcoholFreq
      ? Math.min(100, (healthStatus.alcoholFreq / 7) * 100)
      : 0;
  }

  return Math.min(100, rate * 2);
}
