import type { RiskLevel } from "../constants/risk-colors";

interface DiseaseDescriptionContext {
  smokeFreq: number;
  alcoholFreq: number;
  weight: number;
  height: number;
}

export function getDiseaseDescription(
  disease: string,
  rate: number,
  riskLevel: RiskLevel,
  healthStatus?: DiseaseDescriptionContext,
): string {
  if (disease === "SMOKING") {
    if (riskLevel === "GOOD") {
      return "흡연하지 않습니다. 현재 상태를 유지해 주세요.";
    }
    if (riskLevel === "CRITICAL") {
      return `주 ${healthStatus?.smokeFreq ?? 0}일 흡연 — 심각한 건강 위험. 즉시 금연을 권장합니다.`;
    }
    return `주 ${healthStatus?.smokeFreq ?? 0}일 흡연 — 금연을 시작해 보세요.`;
  }

  if (disease === "ALCOHOL") {
    if (riskLevel === "GOOD") return "음주 빈도가 안전한 수준입니다.";
    if (riskLevel === "CRITICAL") {
      return `주 ${healthStatus?.alcoholFreq ?? 0}일 음주 — 심각한 수준. 음주를 줄여 주세요.`;
    }
    return `주 ${healthStatus?.alcoholFreq ?? 0}일 음주 — 음주 빈도를 줄여 보세요.`;
  }

  if (disease === "OBESITY") {
    if (riskLevel === "GOOD") {
      return "체중이 정상 범위 내에 있습니다. 유지해 주세요.";
    }
    const height = healthStatus?.height ?? 170;
    const weight = healthStatus?.weight ?? 70;
    const bmi = weight / (height / 100) ** 2;
    const targetWeight = Math.round(23 * (height / 100) ** 2 * 10) / 10;
    const diff = Math.round((weight - targetWeight) * 10) / 10;
    if (diff > 0) {
      return `약 ${diff}kg 감량하면 정상 상한(BMI 23)에 도달합니다.`;
    }
    return `BMI ${bmi.toFixed(1)} — 정상 체중입니다.`;
  }

  if (disease === "STRESS") {
    if (riskLevel === "GOOD") {
      return "스트레스 수준이 안정적입니다. 현재 상태를 유지해 주세요.";
    }
    return "동연령 인지율과 유사한 수준. 꾸준한 관리를 권장합니다.";
  }

  if (riskLevel === "GOOD") {
    return "동연령 대비 안심 구간. 현재 상태를 유지해 주세요.";
  }

  return `동연령 대비 ${rate.toFixed(1)}% 수준. 주의가 필요합니다.`;
}

export function getDiseaseRateLabel(
  disease: string,
  rate: number,
  healthStatus?: Pick<DiseaseDescriptionContext, "smokeFreq" | "alcoholFreq">,
): string {
  if (disease === "SMOKING") {
    return healthStatus && healthStatus.smokeFreq > 0 ? "흡연 중" : "비흡연";
  }

  if (disease === "ALCOHOL") {
    if (healthStatus && healthStatus.alcoholFreq >= 5) return "과음";
    return `${rate.toFixed(1)}%`;
  }

  return `${rate.toFixed(1)}%`;
}

export function getDiseaseFooterValue(
  disease: string,
  rate: number,
  rateLabel: string,
  riskLevel: RiskLevel,
): string {
  if (disease === "SMOKING" && riskLevel !== "GOOD") return "위험";
  if (disease === "SMOKING") return rateLabel;
  return `${rate.toFixed(1)}%`;
}
